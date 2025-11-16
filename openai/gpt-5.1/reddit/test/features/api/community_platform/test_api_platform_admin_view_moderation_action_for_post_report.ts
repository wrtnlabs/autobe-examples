import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that a platform administrator can view full details of a moderation
 * action created for a member user–submitted report.
 *
 * Business flow (adapted to available APIs):
 *
 * 1. Register a new platform admin and obtain admin auth context.
 * 2. As platform admin, create a community visibility level (e.g. "public").
 * 3. Register a new member user (join implicitly authenticates the member).
 * 4. As that member, create a community referencing the created visibility level’s
 *    code.
 * 5. As the same member, create a subscription to that community so the
 *    relationship is realistic.
 * 6. As the member, file a report using the memberUser reports endpoint, providing
 *    reporter_type, a synthetic report_reason_category_id, the community_id of
 *    the created community, and descriptive text.
 * 7. Switch back to platformAdmin authentication using the login endpoint.
 * 8. As platformAdmin, create a moderation action under the report using the
 *    reportId path parameter and an ICommunityPlatformModerationAction.ICreate
 *    body that sets community_id, action_type, target_scope, and internal
 *    reason/notes fields.
 * 9. As platformAdmin, fetch the moderation action by its id via the
 *    /communityPlatform/platformAdmin/moderationActions/{moderationActionId}
 *    endpoint.
 * 10. Assert that the fetched moderation action conforms to
 *     ICommunityPlatformModerationAction, and that key fields match the created
 *     action (id, community_platform_report_id, action_type, target_scope,
 *     community_id, reason_summary, notes_internal). Also verify that the
 *     resolved community summary, when present, refers to the same community.
 */
export async function test_api_platform_admin_view_moderation_action_for_post_report(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates as admin)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level as platform admin
  const visibilityCode = "public-" + RandomGenerator.alphaNumeric(8);

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register a member user (join also authenticates as memberUser)
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "192.168.0.10",
    href: "https://community.app.local/signup",
    referrer: "https://community.app.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates a community using the visibility level’s code
  const communityCreateBody = {
    identifier: "community-" + RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Member subscribes to the community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 6. Member files a report scoped to this community
  const reportReasonCategoryId = typia.random<string & tags.Format<"uuid">>();

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reportReasonCategoryId,
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 7. Switch back to platformAdmin authentication via login
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 8. Admin creates a moderation action for the report
  const actionType = "remove_content";
  const targetScope = "post";

  const moderationCreateBody = {
    community_id: community.id,
    action_type: actionType,
    target_scope: targetScope,
    reason_summary: "Content removed due to policy violation in reported post.",
    notes_internal: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdModerationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationCreateBody,
      },
    );
  typia.assert(createdModerationAction);

  // 9. Admin fetches the moderation action by its id
  const fetchedModerationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.at(
      connection,
      {
        moderationActionId: createdModerationAction.id,
      },
    );
  typia.assert(fetchedModerationAction);

  // 10. Validate wiring and field consistency
  TestValidator.equals(
    "moderation action id should match between create and fetch",
    fetchedModerationAction.id,
    createdModerationAction.id,
  );

  TestValidator.equals(
    "moderation action should reference the same report id",
    fetchedModerationAction.community_platform_report_id,
    report.id,
  );

  TestValidator.equals(
    "action_type should match the value used at creation",
    fetchedModerationAction.action_type,
    actionType,
  );

  TestValidator.equals(
    "target_scope should match the value used at creation",
    fetchedModerationAction.target_scope,
    targetScope,
  );

  TestValidator.equals(
    "community_id should match the community used at creation",
    fetchedModerationAction.community_id ?? null,
    moderationCreateBody.community_id ?? null,
  );

  TestValidator.equals(
    "reason_summary should be preserved between create and fetch",
    fetchedModerationAction.reason_summary ?? null,
    moderationCreateBody.reason_summary ?? null,
  );

  TestValidator.equals(
    "notes_internal should be preserved between create and fetch",
    fetchedModerationAction.notes_internal ?? null,
    moderationCreateBody.notes_internal ?? null,
  );

  if (fetchedModerationAction.community) {
    TestValidator.equals(
      "resolved community summary id should match original community id",
      fetchedModerationAction.community.id,
      community.id,
    );
  }
}
