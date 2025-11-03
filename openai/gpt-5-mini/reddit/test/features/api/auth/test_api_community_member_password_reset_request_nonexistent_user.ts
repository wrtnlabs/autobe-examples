import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

export async function test_api_community_member_password_reset_request_nonexistent_user(
  connection: api.IConnection,
) {
  // Generate a randomized email that is extremely unlikely to exist in the system
  const email = `no-such-user-${RandomGenerator.alphaNumeric(8)}@example.test`;

  // Build the request body using the exact DTO type with satisfies
  const body = {
    email,
  } satisfies ICommunityBbsCommunityMember.IRequestPasswordReset;

  // 1st request: submit password reset request for the non-existent email
  const response: ICommunityBbsCommunityMember.IResetRequestResponse =
    await api.functional.auth.communityMember.password.reset.request.requestPasswordReset(
      connection,
      { body },
    );

  // Validate response shape and contents
  typia.assert(response);

  // Business rules validation
  TestValidator.predicate(
    "reset request accepted for processing",
    response.success === true,
  );

  // Ensure the human-readable message does not disclose the email (no PII leakage)
  TestValidator.predicate(
    "response message must not contain the supplied email",
    !response.message.includes(email),
  );

  // Idempotence / consistency check: repeat the request and ensure response shape
  const response2: ICommunityBbsCommunityMember.IResetRequestResponse =
    await api.functional.auth.communityMember.password.reset.request.requestPasswordReset(
      connection,
      { body },
    );
  typia.assert(response2);

  // The acknowledgement message should remain non-disclosive and generally consistent
  TestValidator.predicate(
    "second response message must not contain the supplied email",
    !response2.message.includes(email),
  );

  // Basic consistency: both responses must indicate acceptance (opaque success)
  TestValidator.equals(
    "both responses report acceptance",
    response.success,
    response2.success,
  );
}
