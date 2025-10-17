import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Authentication boundary: unauthenticated resend verification must be denied.
 *
 * Validates that POST /auth/member/email/verification/resend rejects requests
 * lacking authentication. This endpoint is protected and should not be callable
 * without a valid member session.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection by cloning the given connection and
 *    clearing headers. Explicitly disable simulation to avoid mock success.
 * 2. Attempt to call the resend endpoint and assert that an error is thrown.
 *
 * Notes:
 *
 * - Do not assert specific HTTP status codes; only verify that an error occurs.
 * - No request body is required by the endpoint.
 */
export async function test_api_member_email_verification_resend_unauthenticated_denied(
  connection: api.IConnection,
) {
  // 1) Build unauthenticated connection (do not touch headers afterwards)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
    simulate: false,
  };

  // 2) Expect error for unauthenticated call (async callback must be awaited)
  await TestValidator.error(
    "unauthenticated resend verification should be denied",
    async () => {
      await api.functional.auth.member.email.verification.resend.resendVerification(
        unauthConn,
      );
    },
  );
}
