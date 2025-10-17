import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussVerifiedExpertEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertEmail";

/**
 * Ensure unauthenticated callers cannot request verified-expert email
 * verification.
 *
 * Scenario:
 *
 * - Construct an unauthenticated connection (empty headers) using the allowed
 *   pattern.
 * - Build a valid request body for IEconDiscussVerifiedExpertEmail.IRequest.
 * - Invoke the endpoint and assert that it throws (no status code assertions).
 *
 * Notes:
 *
 * - In simulate mode, SDK returns random data and does not enforce auth; skip
 *   assertion then.
 */
export async function test_api_verified_expert_verification_email_send_unauthenticated_denied(
  connection: api.IConnection,
) {
  // Skip when SDK is in simulation mode because auth is not enforced there.
  if (connection.simulate === true) {
    TestValidator.predicate(
      "simulation mode cannot verify authentication guard",
      true,
    );
    return;
  }

  // Create an unauthenticated connection without touching headers thereafter
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Valid request body matching IEconDiscussVerifiedExpertEmail.IRequest
  const body = {
    locale: "en-US",
    redirect_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVerifiedExpertEmail.IRequest;

  // Expect the endpoint to reject unauthenticated access
  await TestValidator.error(
    "reject unauthenticated request to send expert verification email",
    async () => {
      await api.functional.auth.verifiedExpert.email.sendVerification(
        unauthConn,
        { body },
      );
    },
  );
}
