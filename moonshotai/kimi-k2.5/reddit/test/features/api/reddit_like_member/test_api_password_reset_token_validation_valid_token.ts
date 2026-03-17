import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberPasswordResetValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordResetValidation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the password reset token validation endpoint when the token is valid and can be used for password recovery.
 *
 * Steps:
 * 1. Check a valid, unused, unexpired password reset token
 *
 * Expected result:
 * - Response with isValid: true
 * - Response includes expiresAt timestamp showing when token expires
 * - Response has reason: null
 *
 * This validates the primary success path where a member has a valid password reset token they can use.
 */
export async function test_api_password_reset_token_validation_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid reset token and validate it
  // The endpoint does not require authentication (auth-type is null)
  const resetId = RandomGenerator.alphaNumeric(32);
  const validationResult: IRedditLikeMemberPasswordResetValidation =
    await api.functional.redditLike.member.password_resets.at(connection, {
      resetId,
    });
  // Validate response structure - typia.assert validates all type constraints
  typia.assert(validationResult);
  // Verify business logic: valid token should have isValid=true, expiresAt present, reason=null
  TestValidator.predicate("token is valid", validationResult.isValid === true);
  TestValidator.predicate(
    "token has expiration timestamp",
    validationResult.expiresAt !== null,
  );
  TestValidator.predicate(
    "reason is null for valid token",
    validationResult.reason === null,
  );
}
