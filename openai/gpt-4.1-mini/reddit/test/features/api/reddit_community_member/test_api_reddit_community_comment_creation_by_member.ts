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

export async function test_api_reddit_community_comment_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Register member via join
  // 2. Create a community
  // 3. Create a post
  // 4. Add a comment to the post
  // Validations at each step including typia.assert and TestValidator to check correctness
  // Follow correct types and sdk usage

  // 1. Register member via join
  // Generate a valid member registration data
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditCommunityMember.ICreate;
  const memberAuthorized: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community id is uuid",
    typeof community.id === "string" && community.id.length > 0,
  );

  // 3. Create a post in the community
  // Prepare post create body, use post_type = "text" with title and body_text
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }).substring(0, 300),
    body_text: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }).substring(0, 10000),
  } satisfies IRedditCommunityPosts.ICreate;
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      { communityId: community.id, body: postCreateBody },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community id matches",
    post.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals("post type is text", post.post_type, "text");

  // 4. Add a comment to the created post
  // Comment body text max length 2000, provide author_member_id as memberAuthorized id
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    author_member_id: memberAuthorized.id,
    body_text: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 8,
    }).substring(0, 2000),
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      { postId: post.id, body: commentCreateBody },
    );
  typia.assert(comment);

  // Validate the comment is associated with correct post and author
  TestValidator.equals(
    "comment post id matches",
    comment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment author member id matches",
    comment.author_member_id ?? null,
    memberAuthorized.id,
  );
  TestValidator.predicate(
    "comment body_text length is reasonable",
    typeof comment.body_text === "string" &&
      comment.body_text.length > 0 &&
      comment.body_text.length <= 2000,
  );
}
