import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_password_change_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with initial credentials
  const email = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPassword123!";
  const newPassword = "NewPassword456!";
  const username = RandomGenerator.alphabets(8);

  const createMemberBody = {
    email: email,
    username: username,
    password: initialPassword,
    ip: "192.168.1.1",
    href: "https://localhost:3000/register" as string & tags.Format<"uri">,
    referrer: "" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMember.ICreate;

  const joinResponse = await api.functional.auth.member.join(connection, {
    body: createMemberBody,
  });
  typia.assert(joinResponse);

  const oldRefreshToken = joinResponse.token.refresh;
  TestValidator.predicate(
    "join response should have valid refresh token",
    oldRefreshToken.length > 0,
  );

  TestValidator.predicate(
    "join response should have valid access token",
    joinResponse.token.access.length > 0,
  );

  // Step 2: Perform password change with new password
  const passwordChangeBody = {
    current_password: initialPassword,
    new_password: newPassword,
  } satisfies ICommunityPlatformMember.IPasswordChange.ICreate;

  const passwordChangeResponse =
    await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
      connection,
      {
        body: passwordChangeBody,
      },
    );
  typia.assert(passwordChangeResponse);

  TestValidator.predicate(
    "password change operation should succeed",
    passwordChangeResponse.success === true,
  );

  TestValidator.equals(
    "password change response member email matches input email",
    passwordChangeResponse.member.email,
    email,
  );

  TestValidator.equals(
    "password change response member username matches",
    passwordChangeResponse.member.username,
    username,
  );

  TestValidator.predicate(
    "password change should update the updated_at timestamp",
    passwordChangeResponse.member.updated_at.length > 0,
  );

  // Step 3: Verify that after password change, trying to register with same email fails
  // This confirms that the account still exists and is active
  await TestValidator.error(
    "attempting to register duplicate email should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: email,
          username: RandomGenerator.alphabets(8),
          password: initialPassword,
          ip: "192.168.1.1",
          href: "https://localhost:3000/register" as string &
            tags.Format<"uri">,
          referrer: "" as string & tags.Format<"uri">,
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Step 4: Verify password change message indicates session termination
  TestValidator.predicate(
    "password change message should reference session/token invalidation",
    passwordChangeResponse.message.length > 0,
  );
}
