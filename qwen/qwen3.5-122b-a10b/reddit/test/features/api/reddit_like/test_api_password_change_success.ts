import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful password change for an authenticated member.
 *
 * Validates the complete password change workflow including identity verification,
 * password validation, hash update, and successful re-authentication with new credentials.
 * The member must provide the correct current password and a valid new password that
 * meets security requirements (minimum 8 characters).
 *
 * 1. Register a new member account with valid credentials (email, password, username).
 * 2. Create a member-specific connection and authenticate using the registration credentials.
 * 3. Change the password by providing the correct current password and a valid new password.
 * 4. Verify the password change was successful by logging in with the new password.
 * 5. Validate that the member record is returned with matching identity information.
 */
export async function test_api_password_change_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditLikeMember.IJoin;
  const authorized: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(authorized);
  // 2. Store old password and prepare new password
  const oldPassword = joinInput.password;
  const newPassword = RandomGenerator.alphaNumeric(16);
  // 3. Change password with correct current password
  const updatedMember: IRedditLikeMember =
    await api.functional.redditLike.member.password.update(memberConnection, {
      body: {
        currentPassword: oldPassword,
        newPassword: newPassword,
      } satisfies IRedditLikeMember.IPasswordChange,
    });
  typia.assert(updatedMember);
  // 4. Verify password change by logging in with new password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginAuthorized: IRedditLikeMember.IAuthorized =
    await authorize_member_login(loginConnection, {
      body: {
        email: joinInput.email,
        password: newPassword,
      },
    });
  typia.assert(loginAuthorized);
  // 5. Validate member identity matches
  TestValidator.equals(
    "member ID matches",
    updatedMember.id,
    loginAuthorized.id,
  );
  TestValidator.equals(
    "email matches",
    updatedMember.email,
    loginAuthorized.email,
  );
  TestValidator.equals(
    "username matches",
    updatedMember.username,
    loginAuthorized.username,
  );
}
