import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Tests karma visibility control through show_karma_publicly privacy setting.
 *
 * This test validates that members can toggle their karma visibility setting
 * and that the boolean value is correctly stored and returned. The test creates
 * a member account, then updates the show_karma_publicly setting multiple times
 * to verify the toggle functionality works in both directions.
 *
 * Steps:
 *
 * 1. Create a new member account with username, email, and password
 * 2. Update privacy settings to set show_karma_publicly to false
 * 3. Validate that the setting is correctly saved and returned as false
 * 4. Update privacy settings to set show_karma_publicly to true
 * 5. Validate that the setting is correctly saved and returned as true
 */
export async function test_api_member_privacy_karma_visibility_toggle(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberCreateData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateData,
    });
  typia.assert(member);

  // Step 2: Set show_karma_publicly to false
  const privacyUpdateFalse = {
    show_karma_publicly: false,
  } satisfies IRedditLikeUser.IUpdatePrivacy;

  const privacySettingsFalse: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member.id,
        body: privacyUpdateFalse,
      },
    );
  typia.assert(privacySettingsFalse);

  // Step 3: Validate show_karma_publicly is false
  TestValidator.equals(
    "karma visibility is disabled",
    privacySettingsFalse.show_karma_publicly,
    false,
  );

  // Step 4: Set show_karma_publicly to true
  const privacyUpdateTrue = {
    show_karma_publicly: true,
  } satisfies IRedditLikeUser.IUpdatePrivacy;

  const privacySettingsTrue: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member.id,
        body: privacyUpdateTrue,
      },
    );
  typia.assert(privacySettingsTrue);

  // Step 5: Validate show_karma_publicly is true
  TestValidator.equals(
    "karma visibility is enabled",
    privacySettingsTrue.show_karma_publicly,
    true,
  );
}
