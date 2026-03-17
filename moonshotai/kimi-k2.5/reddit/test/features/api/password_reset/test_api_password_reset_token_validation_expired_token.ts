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
 * Test the password reset token validation endpoint when the token has expired.
 *
 * Steps:
 * 1. Authenticate as a member
 * 2. Check an expired password reset token
 *
 * Expected result:
 * - Response with isValid: false
 * - Response has reason indicating token invalidity
 * - Response includes expiresAt: null
 *
 * This validates the edge case where a password reset token has passed its expiration time or does not exist.
 */
export async function test_api_password_reset_token_validation_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Generate a random resetId that simulates an expired/non-existent token
  // Since there's no endpoint to create password reset tokens, we use a random token
  // which will be treated as non-existent (effectively expired)
  const resetId = RandomGenerator.alphaNumeric(32);
  // 3. Check the password reset token
  const validationResult: IRedditLikeMemberPasswordResetValidation =
    await api.functional.redditLike.member.password_resets.at(
      memberConnection,
      {
        resetId,
      },
    );
  typia.assert(validationResult);
  // 4. Validate the response indicates an invalid token
  TestValidator.equals(
    "isValid should be false",
    validationResult.isValid,
    false,
  );
  TestValidator.equals(
    "expiresAt should be null",
    validationResult.expiresAt,
    null,
  );
  TestValidator.predicate(
    "reason should indicate token invalidity",
    validationResult.reason === "token_not_found" ||
      validationResult.reason === "token_expired" ||
      validationResult.reason === "token_already_used",
  );
}
