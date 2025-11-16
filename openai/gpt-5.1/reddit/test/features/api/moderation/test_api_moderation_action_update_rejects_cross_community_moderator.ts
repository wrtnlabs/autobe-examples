import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_moderation_action_update_rejects_cross_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a community visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register and authenticate a member user (will own communities and file reports)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create two communities (X and Y) as the member user
  const communityXBody = {
    identifier: `community-x-${RandomGenerator.alphabets(6)}`,
    title: "Community X",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityX: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityXBody },
    );
  typia.assert(communityX);

  const communityYBody = {
    identifier: `community-y-${RandomGenerator.alphabets(6)}`,
    title: "Community Y",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityY: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityYBody },
    );
  typia.assert(communityY);

  // 5. Register two community moderators A and B
  const moderatorAJoinBody = {
    username: `modA_${RandomGenerator.alphabets(6)}`,
    email: `${RandomGenerator.alphabets(8)}@mod.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const moderatorAAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorAJoinBody,
    });
  typia.assert(moderatorAAuthorized);

  const moderatorBJoinBody = {
    username: `modB_${RandomGenerator.alphabets(6)}`,
    email: `${RandomGenerator.alphabets(8)}@mod.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const moderatorBAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorBJoinBody,
    });
  typia.assert(moderatorBAuthorized);

  // 6. As member user, create a report in Community X
  const dummyReasonCategoryId = typia.random<string & tags.Format<"uuid">>();
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: dummyReasonCategoryId,
    community_id: communityX.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 7. As Moderator A, create a moderation action for the report in Community X
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorAJoinBody.email,
      password: moderatorAJoinBody.password,
      ip: "127.0.0.1",
      href: "https://mod.example.com/login",
      referrer: "https://mod.example.com/",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const moderationCreateBody = {
    community_id: communityX.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Initial removal due to policy violation",
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;
  const originalAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      { body: moderationCreateBody },
    );
  typia.assert(originalAction);

  // 8. Switch to Moderator B and attempt to update the moderation action
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorBJoinBody.email,
      password: moderatorBJoinBody.password,
      ip: "127.0.0.1",
      href: "https://mod.example.com/login",
      referrer: "https://mod.example.com/",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const updateBody = {
    action_type: "lock_content",
    target_scope: "post",
    reason_summary: "Cross-community moderator attempting to lock content",
    notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  // Clone original action for comparison to ensure immutability
  const originalSnapshot = {
    id: originalAction.id,
    community_platform_report_id: originalAction.community_platform_report_id,
    communitymoderator_id: originalAction.communitymoderator_id,
    platformadmin_id: originalAction.platformadmin_id,
    community_id: originalAction.community_id,
    action_type: originalAction.action_type,
    target_scope: originalAction.target_scope,
    reason_summary: originalAction.reason_summary,
    notes_internal: originalAction.notes_internal,
    created_at: originalAction.created_at,
    updated_at: originalAction.updated_at,
    actor: originalAction.actor,
    community: originalAction.community,
  } satisfies ICommunityPlatformModerationAction;

  // 9. Expect the update to fail for Moderator B
  await TestValidator.error(
    "cross-community moderator update must be rejected",
    async () => {
      await api.functional.communityPlatform.communityModerator.moderationActions.update(
        connection,
        {
          moderationActionId: originalAction.id,
          body: updateBody,
        },
      );
    },
  );

  // 10. Ensure the in-memory originalAction object has not changed
  TestValidator.equals(
    "original moderation action object must remain unchanged after failed update",
    originalAction,
    originalSnapshot,
  );
}
