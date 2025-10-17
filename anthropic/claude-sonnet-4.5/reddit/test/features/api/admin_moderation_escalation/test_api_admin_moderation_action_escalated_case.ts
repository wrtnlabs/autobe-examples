import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_admin_moderation_action_escalated_case(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create community for moderation context
  const communityData = {
    code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: communityData,
    },
  );
  typia.assert(community);

  // Step 3: Create post that will be reported and moderated
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: postData,
  });
  typia.assert(post);

  // Step 4: Submit content report triggering moderation workflow
  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "harassment,spam",
    additional_context: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeContentReport.ICreate;

  const report = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: reportData,
    },
  );
  typia.assert(report);

  // Step 5: Create moderator account for initial moderation
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModPass123!@#",
  } satisfies IRedditLikeModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 6: Assign moderator to community for moderation permissions
  const moderatorAssignmentData = {
    moderator_id: moderator.id,
    permissions: "manage_posts,manage_comments,access_reports",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorAssignmentData,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 7: Create initial moderation action by moderator
  const moderatorActionData = {
    report_id: report.id,
    affected_post_id: post.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "community",
    reason_category: "spam",
    reason_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 6,
      wordMax: 12,
    }),
    internal_notes: "Initial community-level removal pending admin review",
  } satisfies IRedditLikeModerationAction.ICreate;

  const moderatorAction =
    await api.functional.redditLike.moderator.moderation.actions.create(
      connection,
      {
        body: moderatorActionData,
      },
    );
  typia.assert(moderatorAction);

  // Step 8: Create admin account to handle escalated case
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!@#",
  } satisfies IRedditLikeAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 9: Create platform-level moderation action by admin (escalated decision)
  const adminActionData = {
    report_id: report.id,
    affected_post_id: post.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "platform",
    reason_category: "harassment",
    reason_text: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 7,
      wordMax: 12,
    }),
    internal_notes:
      "Escalated to platform-level removal due to harassment policy violation. Overrides community-level decision.",
  } satisfies IRedditLikeModerationAction.ICreate;

  const adminAction =
    await api.functional.redditLike.admin.moderation.actions.create(
      connection,
      {
        body: adminActionData,
      },
    );
  typia.assert(adminAction);

  // Step 10: Validate admin action properties
  TestValidator.equals("admin action type", adminAction.action_type, "remove");
  TestValidator.equals(
    "admin action content type",
    adminAction.content_type,
    "post",
  );
  TestValidator.equals(
    "admin removal scope",
    adminAction.removal_type,
    "platform",
  );
  TestValidator.equals(
    "admin reason category",
    adminAction.reason_category,
    "harassment",
  );
  TestValidator.predicate(
    "admin action has reason text",
    adminAction.reason_text.length > 0,
  );
  TestValidator.predicate(
    "admin action is completed",
    adminAction.status === "completed",
  );
}
