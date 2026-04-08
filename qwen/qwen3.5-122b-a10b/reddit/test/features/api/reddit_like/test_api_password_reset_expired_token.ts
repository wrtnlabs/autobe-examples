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
 * Test password reset with expired token rejection.
 *
 * Validates that the password reset system properly rejects expired or non-existent reset tokens with a 410 Gone status. This test ensures that stale recovery attempts are blocked and member account security is maintained.
 *
 * The test creates a member account, then attempts to complete a password reset using an invalid reset token. The system must reject this attempt and leave the member's password unchanged.
 *
 * 1. Create a member account with valid credentials.
 * 2. Attempt password reset with an expired/non-existent reset token (random UUID).
 * 3. Verify the system returns 410 Gone error.
 * 4. Verify the member can still login with original password.
 * 5. Ensure the password reset flow maintains account security.
 */
export async function test_api_password_reset_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditLikeMember.IJoin;
  const authorized: IRedditLikeMember.IAuthorized =
    await api.functional.redditLike.auth.member.join(memberConnection, {
      body: joinInput,
    });
  typia.assert(authorized);
  // Store original password for verification
  const originalPassword = joinInput.password;
  // 2. Attempt password reset with expired/non-existent token
  const expiredResetId = typia.random<string & tags.Format<"uuid">>();
  const newPassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.httpError(
    "expired token should return 410 Gone",
    410,
    async () => {
      await api.functional.redditLike.member.password_resets.update(
        memberConnection,
        {
          resetId: expiredResetId,
          body: {
            password: newPassword,
          } satisfies IRedditLikeMemberPasswordReset.IUpdate,
        },
      );
    },
  );
  // 3. Verify member can still login with original password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await api.functional.redditLike.auth.member.login(
    loginConnection,
    {
      body: {
        email: joinInput.email,
        password: originalPassword,
      },
    },
  );
  typia.assert(loginResult);
  // 4. Verify the member identity is unchanged
  TestValidator.equals(
    "member email remains the same",
    loginResult.email,
    joinInput.email,
  );
  TestValidator.equals(
    "member username remains the same",
    loginResult.username,
    joinInput.username,
  );
}
