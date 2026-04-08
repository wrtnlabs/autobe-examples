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
 * Test password reset verification with invalid token rejection.
 *
 * Validates that the password reset verification endpoint properly rejects invalid or non-existent reset tokens with appropriate error responses. This security test ensures that attackers cannot use fabricated tokens to attempt password resets or enumerate valid token formats.
 *
 * The test creates a valid member account, then attempts to verify a password reset using a randomly generated token that does not exist in the system. It validates that the operation fails with 401 Unauthorized, confirming that the token validation logic is working correctly.
 *
 * Security considerations:
 * - Invalid tokens must be rejected without revealing whether the token format was valid
 * - Error responses should not leak information about existing tokens or email addresses
 * - The system must prevent token enumeration attacks through generic error messages
 *
 * 1. Register a new member account with valid credentials
 * 2. Generate a random token that does not exist in the system
 * 3. Attempt password reset verification with the invalid token
 * 4. Validate that the operation fails with 401 Unauthorized error
 */
export async function test_api_password_reset_verification_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Attempt password reset verification with invalid token
  const invalidToken = typia.random<string>();
  const newPassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.httpError(
    "invalid token should return 401 Unauthorized",
    401,
    async () => {
      await api.functional.redditLike.member.password_resets.verify(
        memberConnection,
        {
          body: {
            token: invalidToken,
            password: newPassword,
          } satisfies IRedditLikeMemberPasswordReset.IRequest,
        },
      );
    },
  );
}
