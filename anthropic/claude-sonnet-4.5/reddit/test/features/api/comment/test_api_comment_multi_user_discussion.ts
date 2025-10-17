import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_comment_multi_user_discussion(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const firstMemberPassword = typia.random<string & tags.MinLength<8>>();

  const firstMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: firstMemberUsername,
        email: firstMemberEmail,
        password: firstMemberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(firstMember);

  // Step 2: First member creates a community
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: First member creates a post
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: First member creates first comment
  const firstComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(firstComment);
  TestValidator.equals(
    "first comment should be top-level",
    firstComment.depth,
    0,
  );
  TestValidator.equals(
    "first comment should reference correct post",
    firstComment.reddit_like_post_id,
    post.id,
  );

  // Step 5: Create second member account
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const secondMemberPassword = typia.random<string & tags.MinLength<8>>();

  const secondMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: secondMemberUsername,
        email: secondMemberEmail,
        password: secondMemberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 6: Second member replies to first comment
  const replyComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: firstComment.id,
        content_text: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(replyComment);
  TestValidator.equals("reply should have depth 1", replyComment.depth, 1);
  TestValidator.equals(
    "reply should reference parent comment",
    replyComment.reddit_like_parent_comment_id,
    firstComment.id,
  );
  TestValidator.equals(
    "reply should reference correct post",
    replyComment.reddit_like_post_id,
    post.id,
  );

  // Step 7: Create third member account
  const thirdMemberEmail = typia.random<string & tags.Format<"email">>();
  const thirdMemberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const thirdMemberPassword = typia.random<string & tags.MinLength<8>>();

  const thirdMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: thirdMemberUsername,
        email: thirdMemberEmail,
        password: thirdMemberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(thirdMember);

  // Step 8: Third member adds another top-level comment
  const thirdComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 9,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(thirdComment);
  TestValidator.equals(
    "third comment should be top-level",
    thirdComment.depth,
    0,
  );
  TestValidator.equals(
    "third comment should reference correct post",
    thirdComment.reddit_like_post_id,
    post.id,
  );

  // Validate all comments are distinct
  TestValidator.notEquals(
    "first and reply comments should differ",
    firstComment.id,
    replyComment.id,
  );
  TestValidator.notEquals(
    "first and third comments should differ",
    firstComment.id,
    thirdComment.id,
  );
  TestValidator.notEquals(
    "reply and third comments should differ",
    replyComment.id,
    thirdComment.id,
  );
}
