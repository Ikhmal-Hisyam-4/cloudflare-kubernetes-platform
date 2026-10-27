-- Port of backend/app/seed.py (plans + OS images).

INSERT INTO plans (type, name, gpu_model, gpu_count, vcpu, ram_gb, storage_gb, rate_running_cents, rate_stopped_cents) VALUES
  ('gpu', 'RTX Consumer Server', 'RTX 4090', 1, 32, 128, 100, 37, 1),
  ('gpu', 'RTX Pro Server', 'RTX PRO 6000 Blackwell', 1, 64, 256, 100, 89, 1),
  ('gpu', 'GB10 Superchip', 'GB10 Superchip', 1, 20, 128, 100, 79, 1),
  ('cpu', 'Standard CPU', NULL, 0, 8, 32, 80, 9, 1),
  ('cpu', 'Compute Optimized', NULL, 0, 32, 64, 160, 29, 1),
  ('cpu', 'Memory Optimized', NULL, 0, 16, 128, 160, 39, 1);

INSERT INTO os_images (name) VALUES
  ('Ubuntu 24.04 LTS'),
  ('Rocky Linux 9'),
  ('Red Hat Enterprise Linux 9');
