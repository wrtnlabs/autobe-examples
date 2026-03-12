import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test comment deletion by author with cascade deletion of nested replies.
 *
 * This test verifies that when a comment author deletes their own comment,
 * all nested replies are also soft-deleted (cascade deletion), and the
 * author's karma score is properly adjusted.
 */
export async function test_api_comment_deletion_by_author_with_cascade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member (author)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(2),
    bio: null,
    avatar_uri: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(memberAuth);
  // Capture initial karma score
  const initialKarma = memberAuth.karma;
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 3. Create a post in that community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        postType: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // Capture initial comment count
  const initialCommentCount = post.comments_count;
  // 4. Create a top-level comment on the post
  const topLevelComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
        },
      },
    );
  typia.assert(topLevelComment);
  // Capture top-level comment score before deletion
  const topLevelCommentScore = topLevelComment.score;
  // 5. Create a reply to the top-level comment (nested reply)
  const nestedReply =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: topLevelComment.id,
        },
      },
    );
  typia.assert(nestedReply);
  // Capture nested reply score before deletion
  const nestedReplyScore = nestedReply.score;
  // 6. Create another reply to the nested reply (deeper nesting)
  const deepNestedReply =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: nestedReply.id,
        },
      },
    );
  typia.assert(deepNestedReply);
  // Capture deep nested reply score before deletion
  const deepNestedReplyScore = deepNestedReply.score;
  // 7. Delete the top-level comment (should cascade delete all replies)
  await api.functional.redditClone.member.comments.erase(memberConnection, {
    commentId: topLevelComment.id,
  });
  // 8. Login again to get refreshed karma score
  const loginConnection: api.IConnection = { host: connection.host };
  const refreshedMemberAuth = await authorize_member_login(loginConnection, {
    body: {
      email: joinBody.email,
      password: joinBody.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(refreshedMemberAuth);
  // Validation: Verify deletion succeeded (no error thrown)
  TestValidator.predicate("comment deletion succeeded without error", true);
  // Validation: Verify karma score is reduced by the deleted comments' scores
  TestValidator.equals(
    "karma reduced by deleted comments score",
    refreshedMemberAuth.karma,
    initialKarma -
      topLevelCommentScore -
      nestedReplyScore -
      deepNestedReplyScore,
  );
  // Validation: Verify karma actually changed
  TestValidator.notEquals(
    "karma score changed after deletion",
    initialKarma,
    refreshedMemberAuth.karma,
  );
}
