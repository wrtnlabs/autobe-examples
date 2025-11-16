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
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_moderation_action_detail_view_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join)
  const platformAdminJoinInput = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinInput,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create visibility level as platform admin
  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphabets(5)}`,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.test.com` as string &
      tags.Format<"email">,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.local/signup",
    referrer: "https://app.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create community as member user
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Subscribe member user to the community
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

  // 6. Create a post in that community
  const postCreateBody: ICommunityPlatformPost.ICreate = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Create a report for the post
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 8. Re-login as platform admin to ensure correct actor context
  const platformAdminLoginBody = {
    identifier: platformAdminJoinInput.email,
    password: platformAdminJoinInput.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/home",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 9. Create a moderation action for the report
  const moderationCreateBody = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Violation of community guidelines",
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

  // Basic property validations for created moderation action
  TestValidator.equals(
    "created moderation action id is UUID",
    createdModerationAction.id,
    createdModerationAction.id,
  );
  TestValidator.equals(
    "created moderation action report linkage",
    createdModerationAction.community_platform_report_id,
    report.id,
  );

  // 10. Fetch the moderation action via detail endpoint
  const fetchedModerationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.at(
      connection,
      {
        reportId: report.id,
        moderationActionId: createdModerationAction.id,
      },
    );
  typia.assert(fetchedModerationAction);

  // 11. Validate that fetched action matches created one
  TestValidator.equals(
    "fetched id matches created id",
    fetchedModerationAction.id,
    createdModerationAction.id,
  );

  TestValidator.equals(
    "fetched report linkage matches created",
    fetchedModerationAction.community_platform_report_id,
    createdModerationAction.community_platform_report_id,
  );

  TestValidator.equals(
    "fetched action_type equals created",
    fetchedModerationAction.action_type,
    moderationCreateBody.action_type,
  );

  TestValidator.equals(
    "fetched target_scope equals created",
    fetchedModerationAction.target_scope,
    moderationCreateBody.target_scope,
  );

  TestValidator.equals(
    "fetched reason_summary equals created",
    fetchedModerationAction.reason_summary,
    moderationCreateBody.reason_summary,
  );

  TestValidator.equals(
    "fetched notes_internal equals created",
    fetchedModerationAction.notes_internal,
    moderationCreateBody.notes_internal,
  );

  // Actor validation: presence and basic consistency
  TestValidator.predicate(
    "actor is present on fetched moderation action",
    fetchedModerationAction.actor !== undefined &&
      fetchedModerationAction.actor !== null,
  );
  if (fetchedModerationAction.actor) {
    typia.assert<ICommunityPlatformActor.ISummary>(
      fetchedModerationAction.actor,
    );

    TestValidator.predicate(
      "actor id is non-empty UUID-like string",
      fetchedModerationAction.actor.id.length > 0,
    );

    TestValidator.predicate(
      "actorType is non-empty string",
      fetchedModerationAction.actor.actorType.length > 0,
    );

    TestValidator.predicate(
      "displayName is non-empty string",
      fetchedModerationAction.actor.displayName.length > 0,
    );
  }

  // Community validation when present
  if (fetchedModerationAction.community) {
    typia.assert<ICommunityPlatformCommunity.ISummary>(
      fetchedModerationAction.community,
    );
    TestValidator.equals(
      "fetched community id matches created community",
      fetchedModerationAction.community.id,
      community.id,
    );
  }

  // Timestamp validations
  TestValidator.predicate(
    "created_at is non-empty string",
    fetchedModerationAction.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty string",
    fetchedModerationAction.updated_at.length > 0,
  );

  const createdAtDate = new Date(fetchedModerationAction.created_at);
  const updatedAtDate = new Date(fetchedModerationAction.updated_at);

  TestValidator.predicate(
    "created_at is valid date",
    !Number.isNaN(createdAtDate.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !Number.isNaN(updatedAtDate.getTime()),
  );

  TestValidator.predicate(
    "created_at is earlier than or equal to updated_at",
    createdAtDate.getTime() <= updatedAtDate.getTime(),
  );
}
