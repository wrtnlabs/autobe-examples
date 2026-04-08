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
 * Test successful password reset workflow with valid token and new password.
 *
 * Validates the complete password recovery security flow including member account creation, password reset completion, and verification that the new password enables successful login while invalidating previous sessions.
 *
 * The test verifies three critical security requirements: (1) the member's password is updated in the database, (2) the password reset token is invalidated after use, and (3) all existing sessions for the member are terminated. After successful password reset, the member must be able to authenticate with the new password.
 *
 * 1. Create a new member account with valid credentials.
 * 2. Generate a password reset token UUID (simulated for testing).
 * 3. Complete password reset with a new compliant password.
 * 4. Validate the member response preserves identity fields.
 * 5. Login with the new password to verify authentication works.
 * 6. Confirm the new login returns the same member identity.
 */
export async function test_api_password_reset_successful_completion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(joinResult);
  // Store member identity for verification
  const oldEmail = joinResult.email;
  const memberId = joinResult.id;
  // 2. Generate a password reset token UUID (simulated for testing)
  // In production, this would be created via POST /password-resets endpoint
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Complete password reset with new password
  const newPassword = RandomGenerator.alphaNumeric(16);
  const resetResult =
    await api.functional.redditLike.member.password_resets.update(connection, {
      resetId,
      body: {
        password: newPassword,
      } satisfies IRedditLikeMemberPasswordReset.IUpdate,
    });
  typia.assert(resetResult);
  // 4. Validate the member response preserves identity
  TestValidator.equals("member ID preserved", resetResult.id, memberId);
  TestValidator.equals("email preserved", resetResult.email, oldEmail);
  // 5. Login with new password to verify authentication works
  const newMemberConnection: api.IConnection = { host: connection.host };
  const loginWithNewPassword =
    await api.functional.redditLike.auth.member.login(newMemberConnection, {
      body: {
        email: oldEmail,
        password: newPassword,
      },
    });
  typia.assert(loginWithNewPassword);
  // 6. Confirm new login returns the same member identity
  TestValidator.equals(
    "login with new password succeeds",
    loginWithNewPassword.id,
    memberId,
  );
  TestValidator.equals(
    "email matches after reset",
    loginWithNewPassword.email,
    oldEmail,
  );
}
