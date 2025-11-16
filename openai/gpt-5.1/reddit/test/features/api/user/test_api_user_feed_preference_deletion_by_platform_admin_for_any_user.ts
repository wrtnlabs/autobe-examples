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

export async function test_api_user_feed_preference_deletion_by_platform_admin_for_any_user(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) and capture credentials for later login
  const adminJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminJoinOutput: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminJoinOutput);

  // 2. Register a member user (join) and capture member id & credentials
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    ip: RandomGenerator.mobile(),
    href: "https://community.app.local/signup",
    referrer: "https://community.app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberJoinOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberJoinOutput);

  const memberId = memberJoinOutput.id;

  // Sanity: ensure join response reflects the same email/username we sent
  TestValidator.equals(
    "member join - email should match input",
    memberJoinOutput.email,
    memberJoinInput.email,
  );
  TestValidator.equals(
    "member join - username should match input",
    memberJoinOutput.username,
    memberJoinInput.username,
  );

  // 3. As member, create a global userFeedPreferences record (unscoped)
  const memberGlobalPrefCreateBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: true,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const memberGlobalPref: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.create(
      connection,
      { body: memberGlobalPrefCreateBody },
    );
  typia.assert(memberGlobalPref);

  const preferenceId = memberGlobalPref.id;

  // 4. Still as member, create a memberUser-scoped feedPreferences record
  const memberScopedPrefCreateBody = {
    default_post_sort_mode: "new",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const memberScopedPref: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId: memberId,
        body: memberScopedPrefCreateBody,
      },
    );
  typia.assert(memberScopedPref);

  // Ensure the scoped preference belongs to the same member
  TestValidator.equals(
    "scoped preference - member id should match join output",
    memberScopedPref.memberUser.id,
    memberId,
  );

  // 5. Switch authentication context back to platform admin via login
  const adminLoginInput = {
    identifier: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: adminJoinInput.ip ?? undefined,
    href: adminJoinInput.href,
    referrer: adminJoinInput.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginOutput: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLoginOutput);

  TestValidator.equals(
    "admin login id should equal join id",
    adminLoginOutput.id,
    adminJoinOutput.id,
  );

  // 6. As platform admin, delete the member's global user feed preference
  await api.functional.communityPlatform.platformAdmin.userFeedPreferences.erase(
    connection,
    {
      preferenceId,
    },
  );

  // If we reach here without error, deletion succeeded.
  // 7. Verify that the member user account still exists and can authenticate
  const memberLoginInput = {
    identifier: memberJoinInput.email,
    password: memberPassword,
    ip: memberJoinInput.ip ?? undefined,
    href: memberJoinInput.href,
    referrer: memberJoinInput.referrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberLoginOutput);

  TestValidator.equals(
    "member login id should remain unchanged after preference deletion",
    memberLoginOutput.id,
    memberId,
  );

  // 8. As the (re-logged-in) member, create another scoped preference to
  // confirm that the user is still able to update their feed preferences.
  const memberPostDeletePrefBody = {
    default_post_sort_mode: "top",
    show_sensitive_content: false,
    include_recommended_feeds: false,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const memberPostDeletePref: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId: memberId,
        body: memberPostDeletePrefBody,
      },
    );
  typia.assert(memberPostDeletePref);

  TestValidator.equals(
    "post-delete preference - member id should match original member",
    memberPostDeletePref.memberUser.id,
    memberId,
  );
}
