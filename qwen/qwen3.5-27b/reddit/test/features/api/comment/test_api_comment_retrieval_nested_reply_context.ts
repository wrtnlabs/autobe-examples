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
 * Test that retrieving a nested reply comment includes proper thread context.
 * This test verifies that the comment retrieval endpoint correctly returns
 * parent comment information, post context, and author details for deeply
 * nested reply threads (3 levels deep).
 */
export async function test_api_comment_retrieval_nested_reply_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 4. Create top-level comment (parent_id is null)
  const topLevelComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
        },
      },
    );
  typia.assert(topLevelComment);
  // 5. Create reply comment to top-level comment (2nd level)
  const secondLevelComment =
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
  typia.assert(secondLevelComment);
  // 6. Create reply to second comment (3rd level nesting)
  const thirdLevelComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: secondLevelComment.id,
        },
      },
    );
  typia.assert(thirdLevelComment);
  // 7. Retrieve the third-level comment
  const retrievedComment = await api.functional.redditClone.comments.at(
    memberConnection,
    {
      commentId: thirdLevelComment.id,
    },
  );
  typia.assert(retrievedComment);
  // 8. Verify parent field contains second-level comment
  TestValidator.equals(
    "parent comment ID matches",
    retrievedComment.parent?.id,
    secondLevelComment.id,
  );
  TestValidator.equals(
    "parent comment content matches",
    retrievedComment.parent?.content,
    secondLevelComment.content,
  );
  TestValidator.equals(
    "parent comment author matches",
    retrievedComment.parent?.author.id,
    topLevelComment.author.id,
  );
  // 9. Verify post field contains original post information
  TestValidator.equals("post ID matches", retrievedComment.post.id, post.id);
  TestValidator.equals(
    "post title matches",
    retrievedComment.post.title,
    post.title,
  );
  TestValidator.equals(
    "post community matches",
    retrievedComment.post.community.id,
    community.id,
  );
  // 10. Verify author field contains commenter's profile
  TestValidator.equals(
    "author ID matches",
    retrievedComment.author.id,
    topLevelComment.author.id,
  );
  TestValidator.predicate(
    "author has valid username",
    retrievedComment.author.username.length >= 3,
  );
  TestValidator.predicate(
    "author has valid display name",
    retrievedComment.author.display_name.length >= 3,
  );
  // 11. Verify thread structure is maintained
  TestValidator.predicate(
    "comment has valid content",
    retrievedComment.content.length >= 1 &&
      retrievedComment.content.length <= 1000,
  );
  TestValidator.equals(
    "comment content matches original",
    retrievedComment.content,
    thirdLevelComment.content,
  );
  // 12. Verify unlimited nesting depth through parent_id references
  TestValidator.predicate(
    "parent is not null for nested comment",
    retrievedComment.parent !== null,
  );
  TestValidator.predicate(
    "parent has valid score",
    retrievedComment.parent!.score >= 0,
  );
  // 13. Verify all comment scores and timestamps are correctly returned
  TestValidator.predicate(
    "comment score is valid integer",
    typeof retrievedComment.score === "number" &&
      Number.isInteger(retrievedComment.score),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(retrievedComment.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(retrievedComment.updated_at)),
  );
  TestValidator.predicate(
    "comment is not deleted",
    retrievedComment.deleted_at === null,
  );
}
