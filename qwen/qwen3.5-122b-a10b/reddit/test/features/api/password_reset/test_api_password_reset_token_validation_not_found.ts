import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test password reset token validation with non-existent token ID.
 *
 * Validates that attempting to validate a password reset token that does not exist in the system returns a 404 Not Found error. This ensures the API properly handles invalid token IDs without exposing sensitive information about the system.
 *
 * The test authenticates a member and attempts to validate a randomly generated UUID that has no corresponding password reset record in the database. The expected behavior is an HTTP error with 404 status code.
 *
 * 1. Create member-specific connection for authentication.
 * 2. Register and authenticate as a new member.
 * 3. Generate a random UUID that does not exist in the password reset table.
 * 4. Attempt to validate the non-existent password reset token.
 * 5. Verify that HttpError with 404 status is thrown.
 * 6. Validate the error contains proper HTTP error information.
 */
export async function test_api_password_reset_token_validation_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as member
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 3. Generate non-existent UUID
  const nonExistentResetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4-6. Attempt to validate non-existent token and verify 404 error
  await TestValidator.httpError(
    "password reset token not found",
    404,
    async () => {
      await api.functional.redditLike.member.password_resets.at(
        memberConnection,
        {
          resetId: nonExistentResetId,
        },
      );
    },
  );
}
