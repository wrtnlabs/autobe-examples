import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password change rejection when new password matches one of the last 5
 * used passwords.
 *
 * This test validates that the password reuse prevention mechanism correctly
 * rejects password change attempts when the new password matches any of the
 * member's last 5 previously used passwords. This prevents simple password
 * rotation attacks where users cycle between the same few passwords.
 *
 * The test performs the following:
 *
 * 1. Create a member account with initial credentials
 * 2. Build password history by changing password 5 times with unique passwords
 * 3. Verify that attempts to change password to any of the last 5 passwords are
 *    rejected
 * 4. Verify that changing to a completely new password succeeds after rejection
 *    attempts
 */
export async function test_api_member_password_change_password_reuse(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with initial password
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const password1 = "InitialPass@123";

  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: initialEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: password1,
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResponse);

  // Step 2: Build password history by changing password 5 times
  const password2 = "SecondPass@456";
  const passwordChangeResponse2 =
    await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
      connection,
      {
        body: {
          current_password: password1,
          new_password: password2,
        } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
      },
    );
  typia.assert(passwordChangeResponse2);
  TestValidator.predicate(
    "second password change succeeds",
    passwordChangeResponse2.success,
  );

  const password3 = "ThirdPass@789";
  const passwordChangeResponse3 =
    await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
      connection,
      {
        body: {
          current_password: password2,
          new_password: password3,
        } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
      },
    );
  typia.assert(passwordChangeResponse3);
  TestValidator.predicate(
    "third password change succeeds",
    passwordChangeResponse3.success,
  );

  const password4 = "FourthPass@321";
  const passwordChangeResponse4 =
    await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
      connection,
      {
        body: {
          current_password: password3,
          new_password: password4,
        } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
      },
    );
  typia.assert(passwordChangeResponse4);
  TestValidator.predicate(
    "fourth password change succeeds",
    passwordChangeResponse4.success,
  );

  const password5 = "FifthPass@654";
  const passwordChangeResponse5 =
    await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
      connection,
      {
        body: {
          current_password: password4,
          new_password: password5,
        } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
      },
    );
  typia.assert(passwordChangeResponse5);
  TestValidator.predicate(
    "fifth password change succeeds",
    passwordChangeResponse5.success,
  );

  const password6 = "SixthPass@987";
  const passwordChangeResponse6 =
    await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
      connection,
      {
        body: {
          current_password: password5,
          new_password: password6,
        } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
      },
    );
  typia.assert(passwordChangeResponse6);
  TestValidator.predicate(
    "sixth password change succeeds",
    passwordChangeResponse6.success,
  );

  // Step 3: Verify password history is now: password2, password3, password4, password5, password6
  // Attempt to reuse password2 (one of the last 5)
  await TestValidator.error(
    "password change with password2 (from history) should fail",
    async () => {
      await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
        connection,
        {
          body: {
            current_password: password6,
            new_password: password2,
          } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
        },
      );
    },
  );

  // Attempt to reuse password3 (one of the last 5)
  await TestValidator.error(
    "password change with password3 (from history) should fail",
    async () => {
      await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
        connection,
        {
          body: {
            current_password: password6,
            new_password: password3,
          } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
        },
      );
    },
  );

  // Attempt to reuse password5 (one of the last 5)
  await TestValidator.error(
    "password change with password5 (from history) should fail",
    async () => {
      await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
        connection,
        {
          body: {
            current_password: password6,
            new_password: password5,
          } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
        },
      );
    },
  );

  // Step 4: Verify that changing to a completely new password succeeds
  const password7 = "SeventhPass@111";
  const finalPasswordChangeResponse =
    await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
      connection,
      {
        body: {
          current_password: password6,
          new_password: password7,
        } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
      },
    );
  typia.assert(finalPasswordChangeResponse);
  TestValidator.predicate(
    "final password change with new password succeeds",
    finalPasswordChangeResponse.success,
  );
}
