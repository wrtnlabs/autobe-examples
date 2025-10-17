import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_reddit_community_comment_update_by_member(
  connection: api.IConnection,
) {
  // 1. Member registration (join) for authentication
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;
  const memberAuthorized: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(memberAuthorized);

  // 2. Create community using authenticated member
  const communityCreateBody = {
    name: RandomGenerator.name(2).replace(/\s+/g, "_").toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 7,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Create post in the community
  // Select post_type as 'text' to ensure text body is required and well-defined
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }).slice(0, 300),
    body_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityPosts.ICreate;
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      { communityId: community.id, body: postCreateBody },
    );
  typia.assert(post);

  // 4. Create a comment on the post
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    author_member_id: memberAuthorized.id,
    body_text: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 5,
      wordMax: 12,
    }).slice(0, 2000),
  } satisfies IRedditCommunityComment.ICreate;
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      { postId: post.id, body: commentCreateBody },
    );
  typia.assert(comment);

  // 5. Update the comment text content
  const updatedBodyText = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 5,
    wordMax: 15,
  }).slice(0, 2000);
  const commentUpdateBody = {
    body_text: updatedBodyText,
  } satisfies IRedditCommunityComment.IUpdate;
  const updatedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.updateComment(
      connection,
      { postId: post.id, commentId: comment.id, body: commentUpdateBody },
    );
  typia.assert(updatedComment);

  // 6. Validate updated comment text content matches
  TestValidator.equals(
    "updated comment body text matches",
    updatedComment.body_text,
    updatedBodyText,
  );
  // 7. Validate updated comment id and post id remain consistent
  TestValidator.equals(
    "comment id remains same",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment post id remains same",
    updatedComment.reddit_community_post_id,
    post.id,
  );
  // 8. Validate updated_at timestamp is updated (updatedComment.updated_at should be >= original comment.updated_at)
  const originalUpdatedAt = new Date(comment.updated_at);
  const newUpdatedAt = new Date(updatedComment.updated_at);
  TestValidator.predicate(
    "comment updated_at timestamp is updated",
    newUpdatedAt.getTime() >= originalUpdatedAt.getTime(),
  );
}
