import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test profile visibility and activity visibility privacy settings enforcement.
 *
 * This test validates the privacy hierarchy rules where private profile
 * visibility automatically sets activity visibility to private regardless of
 * submitted values.
 *
 * Test Flow:
 *
 * 1. Create a new member account through the join endpoint
 * 2. Update profile with profile_visibility='private' to verify
 *    activity_visibility becomes 'private'
 * 3. Update profile with compatible settings (profile='members_only',
 *    activity='public')
 * 4. Update profile with profile_visibility='public' and
 *    activity_visibility='private' independently
 */
export async function test_api_member_profile_privacy_settings_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberRegistration = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(authorizedMember);

  // Step 2: Update profile with profile_visibility='private'
  // Expected: activity_visibility should automatically be 'private'
  const updatePrivateProfile = {
    profile_visibility: "private" as const,
    activity_visibility: "public" as const,
  } satisfies IDiscussionBoardMember.IUpdate;

  const privateProfileResult: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.users.update(connection, {
      userId: authorizedMember.id,
      body: updatePrivateProfile,
    });
  typia.assert(privateProfileResult);

  TestValidator.equals(
    "private profile visibility enforces private activity visibility",
    privateProfileResult.profile_visibility,
    "private",
  );
  TestValidator.equals(
    "activity visibility automatically set to private when profile is private",
    privateProfileResult.activity_visibility,
    "private",
  );

  // Step 3: Update profile with compatible visibility levels
  // profile='members_only' and activity='public' should both be respected
  const updateCompatibleSettings = {
    profile_visibility: "members_only" as const,
    activity_visibility: "public" as const,
  } satisfies IDiscussionBoardMember.IUpdate;

  const compatibleSettingsResult: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.users.update(connection, {
      userId: authorizedMember.id,
      body: updateCompatibleSettings,
    });
  typia.assert(compatibleSettingsResult);

  TestValidator.equals(
    "profile visibility set to members_only",
    compatibleSettingsResult.profile_visibility,
    "members_only",
  );
  TestValidator.equals(
    "activity visibility set to public when compatible",
    compatibleSettingsResult.activity_visibility,
    "public",
  );

  // Step 4: Update profile with profile_visibility='public' and activity_visibility='private'
  // Independent settings should work correctly when profile is not private
  const updateIndependentSettings = {
    profile_visibility: "public" as const,
    activity_visibility: "private" as const,
  } satisfies IDiscussionBoardMember.IUpdate;

  const independentSettingsResult: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.users.update(connection, {
      userId: authorizedMember.id,
      body: updateIndependentSettings,
    });
  typia.assert(independentSettingsResult);

  TestValidator.equals(
    "profile visibility set to public",
    independentSettingsResult.profile_visibility,
    "public",
  );
  TestValidator.equals(
    "activity visibility independently set to private",
    independentSettingsResult.activity_visibility,
    "private",
  );
}
