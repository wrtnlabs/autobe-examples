import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
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

export async function test_api_moderation_action_detail_view_by_community_moderator_for_reported_post(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (also authenticates)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(12),
        email: platformAdminEmail,
        password: "AdminPassword!234",
        displayName: RandomGenerator.name(),
        ip: RandomGenerator.alphabets(8),
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. Member user A joins
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberAJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberAEmail,
      password: "MemberAPassword!234",
      ip: RandomGenerator.alphabets(8),
      href: "https://app.example.com/join/memberA",
      referrer: "https://app.example.com/home",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAJoin);

  // 4. Member user A creates a community using the created visibility level
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 5. Member user A subscribes to the community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription);

  // 6. Member user A creates a post in the community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: postCreateBody,
    },
  );
  typia.assert<ICommunityPlatformPost>(post);

  // 7. Member user B joins (reporter)
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberBJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberBEmail,
      password: "MemberBPassword!234",
      ip: RandomGenerator.alphabets(8),
      href: "https://app.example.com/join/memberB",
      referrer: "https://app.example.com/home",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberBJoin);

  // 8. Member user B creates a report against the post
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 9. Switch to platform admin by logging in (explicit login path)
  const platformAdminLogin = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        identifier: platformAdminEmail,
        password: "AdminPassword!234",
        ip: RandomGenerator.alphabets(8),
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/home",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminLogin);

  // 10. Platform admin creates moderation action for the report
  const moderationCreateBody = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: RandomGenerator.paragraph({ sentences: 4 }),
    notes_internal: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationCreateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 10-b. Create a second moderation action for the same report
  const secondModerationCreateBody = {
    community_id: community.id,
    action_type: "label_content",
    target_scope: "post",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const secondModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: secondModerationCreateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(secondModerationAction);

  // 11. Community moderator joins
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const communityModeratorJoin =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: "ModeratorPassword!234",
        display_name: RandomGenerator.name(),
        ip: RandomGenerator.alphabets(8),
        href: "https://mod.example.com/join",
        referrer: "https://mod.example.com/home",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    communityModeratorJoin,
  );

  const moderatorId = communityModeratorJoin.id;

  // 12. Platform admin assigns moderator to the community
  const assignmentCreateBody = {
    communityModeratorId: moderatorId,
    assignedAt: new Date().toISOString(),
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const assignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: assignmentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorAssignment>(assignment);

  TestValidator.equals(
    "moderator assignment community id matches community",
    assignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator assignment moderator id matches join id",
    assignment.communityModerator.id,
    moderatorId,
  );
  TestValidator.predicate(
    "moderator assignment is active",
    assignment.isActive === true,
  );

  // 13. Moderator logs in to ensure they have an active session/token
  const moderatorLogin = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        identifier: moderatorEmail,
        password: "ModeratorPassword!234",
        ip: RandomGenerator.alphabets(8),
        href: "https://mod.example.com/login",
        referrer: "https://mod.example.com/home",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLogin,
  );

  // 14. Moderator fetches moderation action details via communityModerator endpoint
  const fetchedAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.at(
      connection,
      {
        reportId: report.id,
        moderationActionId: moderationAction.id,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(fetchedAction);

  // 15. Validate core identity fields
  TestValidator.equals(
    "fetched moderation action id matches created id",
    fetchedAction.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "fetched moderation action report id matches report id",
    fetchedAction.community_platform_report_id,
    report.id,
  );
  TestValidator.equals(
    "fetched moderation action type matches created",
    fetchedAction.action_type,
    moderationCreateBody.action_type,
  );
  TestValidator.equals(
    "fetched moderation action target scope matches created",
    fetchedAction.target_scope,
    moderationCreateBody.target_scope,
  );

  // 16. Validate community reference if present
  if (fetchedAction.community) {
    TestValidator.equals(
      "fetched moderation action community id matches community",
      fetchedAction.community.id,
      community.id,
    );
  }

  // 17. Validate actor summary if present
  if (fetchedAction.actor) {
    TestValidator.predicate(
      "fetched moderation action actor id is non-empty",
      fetchedAction.actor.id.length > 0,
    );
    TestValidator.predicate(
      "fetched moderation action actorType is non-empty",
      fetchedAction.actor.actorType.length > 0,
    );
  }

  // 18. Validate timestamps: created_at and updated_at
  TestValidator.predicate(
    "fetched moderation action created_at is non-empty",
    fetchedAction.created_at.length > 0,
  );
  TestValidator.predicate(
    "fetched moderation action updated_at is non-empty",
    fetchedAction.updated_at.length > 0,
  );

  TestValidator.predicate(
    "fetched moderation action created_at <= updated_at (lexicographically)",
    fetchedAction.created_at <= fetchedAction.updated_at,
  );

  // 19. Ensure community_platform_report_id scoping is correct by checking second action
  TestValidator.equals(
    "second moderation action report id matches original report",
    secondModerationAction.community_platform_report_id,
    report.id,
  );
}
