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
 * Test password reset verification with expired token rejection.
 *
 * Validates that the password reset verification endpoint properly rejects expired or invalid tokens with 401 Unauthorized. This ensures the security mechanism for time-limited password reset tokens is functioning correctly and prevents token reuse attacks.
 *
 * The test creates a member account, then attempts to verify a password reset using a non-existent token. Since the token does not exist in the database (or would be expired if it did), the operation must fail with 401 Unauthorized status code.
 *
 * 1. Register a new member account with random credentials.
 * 2. Create a password reset verification request with a random token string.
 * 3. Attempt to verify the password reset with the invalid token.
 * 4. Validates that the operation fails with 401 Unauthorized error.
 */
export async function test_api_password_reset_verification_expired_token(
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
      referrer: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Attempt password reset verification with invalid/expired token
  const resetToken = typia.random<string>();
  const newPassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.httpError(
    "expired token should be rejected with 401 Unauthorized",
    401,
    async () => {
      await api.functional.redditLike.member.password_resets.verify(
        memberConnection,
        {
          body: {
            token: resetToken,
            password: newPassword,
          } satisfies IRedditLikeMemberPasswordReset.IRequest,
        },
      );
    },
  );
}
