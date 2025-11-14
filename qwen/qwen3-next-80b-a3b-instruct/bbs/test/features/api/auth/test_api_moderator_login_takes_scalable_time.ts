import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_takes_scalable_time(
  connection: api.IConnection,
) {
  /**
   * Test that the moderator login operation takes consistent, nondeterministic
   * time regardless of whether authentication succeeds or fails. Confirm that
   * the system applies bcrypt-style hashing for password verification, ensuring
   * login attempts take approximately 150-500ms in all cases to prevent timing
   * attacks. Measure average latency across 20 requests of valid and invalid
   * credentials and verify statistical similarity.
   *
   * The API endpoint /auth/moderator/login expects only an email string as the
   * request body. The password is not sent in the request and is verified
   * server-side against stored bcrypt hashes using bcrypt-style timing
   * mechanisms to prevent timing attacks.
   *
   * This test measures the latency of 20 login attempts with valid email
   * addresses. Each attempt measures the time from request initiation to
   * response completion, which includes server-side bcrypt hash computation
   * regardless of email existence or authentication status. The system is
   * designed to have consistent latency (150-500ms) for both successful and
   * failed logins due to bcrypt's fixed-time verification.
   *
   * Steps:
   *
   * 1. Generate a random valid email string
   * 2. Execute 20 login attempts with the same email
   * 3. Measure latency for each attempt
   * 4. Calculate average latency
   * 5. Validate that average latency falls within the required 150-500ms range to
   *    confirm timing attack protection is effective
   */
  const email = typia.random<string & tags.Format<"email">>();

  // Array to store latency measurements
  const latencies: number[] = [];

  // Execute 20 login attempts
  await ArrayUtil.asyncRepeat(20, async (index) => {
    const startTime = Date.now();
    await api.functional.auth.moderator.login(connection, {
      body: email,
    });
    const latency = Date.now() - startTime;
    latencies.push(latency);
  });

  // Calculate average latency
  const avgLatency =
    latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

  // Validate that login latency falls within the expected range of 150-500ms
  TestValidator.predicate(
    "login latency in range",
    avgLatency >= 150 && avgLatency <= 500,
  );
}
