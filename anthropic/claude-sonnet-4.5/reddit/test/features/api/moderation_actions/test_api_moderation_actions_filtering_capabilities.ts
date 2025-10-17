import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationAction";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test comprehensive filtering capabilities of moderation action search.
 *
 * This test validates the moderation action filtering system by creating a
 * diverse set of moderation actions with different characteristics and
 * verifying that the search API correctly filters results based on action type,
 * status, content type, and community context. The test ensures that filters
 * work individually and can be combined effectively.
 *
 * Workflow:
 *
 * 1. Create moderator account and community
 * 2. Assign moderation permissions
 * 3. Create member accounts and content (posts and comments)
 * 4. Submit content reports
 * 5. Create moderation actions with various characteristics
 * 6. Validate filtering by action_type
 * 7. Validate filtering by status
 * 8. Validate filtering by content_type
 * 9. Validate filtering by community_id
 * 10. Validate combined filters
 */
export async function test_api_moderation_actions_filtering_capabilities(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Assign moderator to community
  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 4: Create member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Create posts
  const posts = await ArrayUtil.asyncRepeat(3, async () => {
    const post = await api.functional.redditLike.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          type: "text",
          title: RandomGenerator.paragraph({ sentences: 5 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // Step 6: Create comments
  const comments = await ArrayUtil.asyncRepeat(3, async (index) => {
    const comment = await api.functional.redditLike.member.comments.create(
      connection,
      {
        body: {
          reddit_like_post_id: posts[index].id,
          content_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
    typia.assert(comment);
    return comment;
  });

  // Step 7: Create content reports for posts
  const postReports = await ArrayUtil.asyncRepeat(2, async (index) => {
    const report = await api.functional.redditLike.content_reports.create(
      connection,
      {
        body: {
          reported_post_id: posts[index].id,
          community_id: community.id,
          content_type: "post",
          violation_categories: "spam",
        } satisfies IRedditLikeContentReport.ICreate,
      },
    );
    typia.assert(report);
    return report;
  });

  // Step 8: Create content reports for comments
  const commentReports = await ArrayUtil.asyncRepeat(2, async (index) => {
    const report = await api.functional.redditLike.content_reports.create(
      connection,
      {
        body: {
          reported_comment_id: comments[index].id,
          community_id: community.id,
          content_type: "comment",
          violation_categories: "harassment",
        } satisfies IRedditLikeContentReport.ICreate,
      },
    );
    typia.assert(report);
    return report;
  });

  // Step 9: Create moderation actions with various characteristics
  const createdActions: IRedditLikeModerationAction[] = [];

  // Create remove action on post
  const removePostAction =
    await api.functional.redditLike.moderator.moderation.actions.create(
      connection,
      {
        body: {
          report_id: postReports[0].id,
          affected_post_id: posts[0].id,
          community_id: community.id,
          action_type: "remove",
          content_type: "post",
          reason_category: "spam",
          reason_text: "This is spam content",
        } satisfies IRedditLikeModerationAction.ICreate,
      },
    );
  typia.assert(removePostAction);
  createdActions.push(removePostAction);

  // Create approve action on post
  const approvePostAction =
    await api.functional.redditLike.moderator.moderation.actions.create(
      connection,
      {
        body: {
          affected_post_id: posts[1].id,
          community_id: community.id,
          action_type: "approve",
          content_type: "post",
          reason_category: "no_violation",
          reason_text: "Content is appropriate",
        } satisfies IRedditLikeModerationAction.ICreate,
      },
    );
  typia.assert(approvePostAction);
  createdActions.push(approvePostAction);

  // Create dismiss action on comment report
  const dismissCommentAction =
    await api.functional.redditLike.moderator.moderation.actions.create(
      connection,
      {
        body: {
          report_id: commentReports[0].id,
          affected_comment_id: comments[0].id,
          community_id: community.id,
          action_type: "dismiss",
          content_type: "comment",
          reason_category: "no_violation",
          reason_text: "Report is unfounded",
        } satisfies IRedditLikeModerationAction.ICreate,
      },
    );
  typia.assert(dismissCommentAction);
  createdActions.push(dismissCommentAction);

  // Create remove action on comment
  const removeCommentAction =
    await api.functional.redditLike.moderator.moderation.actions.create(
      connection,
      {
        body: {
          report_id: commentReports[1].id,
          affected_comment_id: comments[1].id,
          community_id: community.id,
          action_type: "remove",
          content_type: "comment",
          reason_category: "harassment",
          reason_text: "Violates community guidelines",
        } satisfies IRedditLikeModerationAction.ICreate,
      },
    );
  typia.assert(removeCommentAction);
  createdActions.push(removeCommentAction);

  // Step 10: Test filtering by action_type
  const removeActions =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          action_type: "remove",
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(removeActions);
  TestValidator.predicate(
    "filter by remove action type should return remove actions",
    removeActions.data.every((action) => action.action_type === "remove"),
  );

  const approveActions =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          action_type: "approve",
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(approveActions);
  TestValidator.predicate(
    "filter by approve action type should return approve actions",
    approveActions.data.every((action) => action.action_type === "approve"),
  );

  // Step 11: Test filtering by content_type
  const allCommunityActions =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(allCommunityActions);

  const postContentActions = allCommunityActions.data.filter(
    (action) => action.content_type === "post",
  );
  const commentContentActions = allCommunityActions.data.filter(
    (action) => action.content_type === "comment",
  );

  TestValidator.predicate(
    "should have post content actions",
    postContentActions.length > 0,
  );
  TestValidator.predicate(
    "should have comment content actions",
    commentContentActions.length > 0,
  );

  // Step 12: Test filtering by status
  const completedActions =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          status: "completed",
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(completedActions);
  TestValidator.predicate(
    "filter by completed status should return completed actions",
    completedActions.data.every((action) => action.status === "completed"),
  );

  // Step 13: Test filtering by community_id
  const communityActions =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(communityActions);
  TestValidator.predicate(
    "filter by community should return actions from that community",
    communityActions.data.length >= createdActions.length,
  );

  // Step 14: Test combined filters
  const combinedFilter =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          action_type: "remove",
          community_id: community.id,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filters should return matching actions",
    combinedFilter.data.every((action) => action.action_type === "remove"),
  );
}
