import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test retrieving a specific moderation log entry by its unique identifier.
 *
 * This test validates that moderators can access detailed log information for
 * moderation events in their assigned communities, ensuring transparency and
 * accountability in the moderation workflow.
 *
 * Workflow steps:
 *
 * 1. Create moderator account to perform moderation actions
 * 2. Create community where moderation will occur
 * 3. Assign moderator to the community
 * 4. Create member account for content creation
 * 5. Create a post in the community
 * 6. Submit content report against the post
 * 7. Create moderation action in response to the report (this generates a log
 *    entry)
 * 8. Retrieve the moderation log entry using its unique log ID
 */
export async function test_api_moderation_log_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: moderatorEmail,
      password: "SecurePass123!",
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12).toLowerCase(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // 3. Assign moderator to the community
  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // 4. Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: "MemberPass456!",
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // 5. Create a post in the community
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 6,
      }),
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // 6. Submit content report against the post
  const report = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,inappropriate_content",
        additional_context: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report);

  // Re-authenticate as moderator (token was overwritten by member registration)
  const moderatorReauth = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: "ModeratorPass789!",
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderatorReauth);

  // Assign new moderator to community
  const secondModeratorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderatorReauth.id,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(secondModeratorAssignment);

  // 7. Create moderation action in response to the report (this generates a log entry)
  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: report.id,
        affected_post_id: post.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community_level",
        reason_category: "spam",
        reason_text: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 8,
        }),
        internal_notes: "Post removed due to spam violation",
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction);

  // 8. Retrieve the moderation log entry
  // Note: We use the moderation action ID as the log ID since the API documentation
  // suggests the log is created with the same ID as the triggering action
  const moderationLog =
    await api.functional.redditLike.moderator.moderation.logs.at(connection, {
      logId: moderationAction.id,
    });
  typia.assert(moderationLog);

  // Validate that the log entry was successfully retrieved
  TestValidator.predicate(
    "moderation log entry was retrieved",
    moderationLog !== null && moderationLog !== undefined,
  );
}
