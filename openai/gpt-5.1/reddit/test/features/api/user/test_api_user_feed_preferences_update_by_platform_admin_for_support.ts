import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserFeedPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserFeedPreferences";

/**
 * Validate that a platform administrator can update a member user's feed
 * preferences using the admin-scoped endpoint, and that a regular member user
 * cannot call the same admin endpoint.
 *
 * Business context:
 *
 * - Member users control their own feed preferences via memberUser endpoints.
 * - Platform admins may need to adjust those preferences for support/safety.
 * - The admin endpoint must be restricted to platformAdmin actors.
 *
 * Steps:
 *
 * 1. Register a member user via /auth/memberUser/join.
 * 2. As that member user, create a feed preferences row via
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/feedPreferences.
 * 3. Register a platform admin via /auth/platformAdmin/join.
 * 4. As the platform admin, update the member user's feed preferences via
 *    /communityPlatform/platformAdmin/userFeedPreferences/{preferenceId}.
 *
 *    - Change some fields while leaving others untouched.
 *    - Confirm updated fields changed and untouched fields stayed the same.
 * 5. Re-authenticate as the member user and attempt to call the admin update
 *    endpoint, expecting an authorization error.
 */
export async function test_api_user_feed_preferences_update_by_platform_admin_for_support(
  connection: api.IConnection,
) {
  // 1. Register a member user
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!",
    href: "https://member.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // 2. Create a feed preference row for the member user using the memberUser-scoped endpoint
  const createPreferencesBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const createdPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId: memberAuthorized.id,
        body: createPreferencesBody,
      },
    );
  typia.assert(createdPreferences);

  TestValidator.equals(
    "created preferences default_post_sort_mode matches input",
    createdPreferences.default_post_sort_mode,
    createPreferencesBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "created preferences show_sensitive_content matches input",
    createdPreferences.show_sensitive_content,
    createPreferencesBody.show_sensitive_content,
  );
  TestValidator.equals(
    "created preferences include_recommended_feeds matches input",
    createdPreferences.include_recommended_feeds,
    createPreferencesBody.include_recommended_feeds,
  );

  // 3. Register a platform admin (this call switches Authorization header to admin)
  const platformAdminJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(2),
    href: "https://admin.join.example.com/",
    referrer: "https://admin-landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinInput,
    });
  typia.assert(platformAdminAuthorized);

  // 4. As platform admin, update the member user's feed preferences via admin endpoint
  const updatePreferencesBody = {
    default_post_sort_mode: "new",
    show_sensitive_content: true,
    // include_recommended_feeds omitted to ensure it stays unchanged
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  const updatedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.platformAdmin.userFeedPreferences.update(
      connection,
      {
        preferenceId: createdPreferences.id,
        body: updatePreferencesBody,
      },
    );
  typia.assert(updatedPreferences);

  TestValidator.equals(
    "updated preferences id should match original",
    updatedPreferences.id,
    createdPreferences.id,
  );
  TestValidator.equals(
    "default_post_sort_mode should be updated by admin",
    updatedPreferences.default_post_sort_mode,
    updatePreferencesBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "show_sensitive_content should be updated by admin",
    updatedPreferences.show_sensitive_content,
    updatePreferencesBody.show_sensitive_content,
  );
  TestValidator.equals(
    "include_recommended_feeds should remain unchanged when omitted in update",
    updatedPreferences.include_recommended_feeds,
    createdPreferences.include_recommended_feeds,
  );

  // 5. Switch back to member user by logging in as that user
  const memberLoginInput = {
    identifier: memberJoinInput.email,
    password: memberJoinInput.password,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberLoginAuthorized);

  // 6. Try to call the admin endpoint as member user and expect an error
  await TestValidator.error(
    "member user must not be able to call platformAdmin userFeedPreferences.update",
    async () => {
      await api.functional.communityPlatform.platformAdmin.userFeedPreferences.update(
        connection,
        {
          preferenceId: createdPreferences.id,
          body: {
            default_post_sort_mode: "top",
          } satisfies ICommunityPlatformUserFeedPreferences.IUpdate,
        },
      );
    },
  );
}
