import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICivicBoardEmailVerificationOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardEmailVerificationOfUser";

/**
 * Ensure unauthenticated users cannot request email verification issuance.
 *
 * Business rule:
 *
 * - POST /auth/user/email/verify/request requires an authenticated session and
 *   binds issuance to the current civic_board_users.id.
 * - Anonymous callers must be rejected and no token should be issued.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection (headers: {}). Do not otherwise touch
 *    headers.
 * 2. Invoke the endpoint with a minimal valid body ({} satisfies IRequest).
 * 3. Expect an error (authorization enforced). Do not assert specific HTTP status
 *    codes.
 * 4. If the SDK is in simulate mode, skip the negative test because simulator does
 *    not enforce auth and returns random data.
 */
export async function test_api_email_verification_request_unauthenticated_denied(
  connection: api.IConnection,
) {
  // Simulator mode cannot enforce authorization; skip negative path under simulate.
  if (connection.simulate === true) {
    TestValidator.predicate(
      "skip unauthenticated denial test under simulator mode",
      true,
    );
    return;
  }

  // 1) Prepare unauthenticated connection (allowed pattern: create new connection with empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Minimal valid body: IRequest with no delivery hints
  const body = {} satisfies ICivicBoardEmailVerificationOfUser.IRequest;

  // 3) Expect authorization error for unauthenticated call
  await TestValidator.error(
    "unauthenticated users cannot request email verification",
    async () => {
      await api.functional.auth.user.email.verify.request.requestEmailVerification(
        unauthConn,
        { body },
      );
    },
  );
}
