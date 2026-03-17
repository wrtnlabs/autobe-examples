import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";

/**
 * Test successful retrieval of a specific comment within a post's comment thread with nested replies.
 *
 * **Setup:**
 * 1. Create a member account via authorize_member_join utility
 * 2. Create a community via generate_random_reddit_clone_communities_create utility
 * 3. Create a post in the community via generate_random_reddit_clone_member_posts_create utility
 * 4. Create a top-level comment on the post via generate_random_reddit_clone_member_posts_comments_create utility
 * 5. Create a reply comment to the first comment via generate_random_reddit_clone_member_posts_comments_create utility with parent_comment_id
 * 6. Create another nested reply to test deeper threading (reply to the reply)
 *
 * **Test Execution:**
 * Call GET /redditClone/posts/{postId}/comments/{commentId} with the top-level comment's ID.
 *
 * **Validation Points:**
 * - Response contains the complete IRedditCloneComment object
 * - Comment body matches the created content
 * - Author information is present with correct username and display_name
 * - Post reference matches the created post (title, post_type, community)
 * - Parent field is null for top-level comment
 * - Children array contains the reply comment(s) with correct structure
 * - Each child comment has the correct parent reference
 * - Vote score is correctly computed (should be 0 if no votes cast)
 * - created_at and updated_at timestamps are present
 * - deleted_at is null (comment is active)
 * - Nested replies maintain proper hierarchical structure (grandchild in children of child)
 *
 * **Business Logic Verified:**
 * - Comment retrieval within post context works correctly
 * - Threaded reply structure is properly loaded with unlimited depth
 * - Author information is correctly joined
 * - Vote score aggregation works (even when 0)
 * - Only active (non-deleted) comments are returned
 */
export async function test_api_comment_retrieval_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authenticated connection
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const memberConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Create post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // 4. Create top-level comment
  const topLevelCommentBody = RandomGenerator.paragraph({ sentences: 3 });
  const topLevelComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: topLevelCommentBody,
          parent_comment_id: null,
        },
      },
    );
  typia.assert(topLevelComment);
  // 5. Create reply comment (first level reply)
  const firstReplyBody = RandomGenerator.paragraph({ sentences: 2 });
  const firstReply =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: firstReplyBody,
          parent_comment_id: topLevelComment.id,
        },
      },
    );
  typia.assert(firstReply);
  // 6. Create nested reply (reply to the reply - second level)
  const secondReplyBody = RandomGenerator.paragraph({ sentences: 2 });
  const secondReply =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: secondReplyBody,
          parent_comment_id: firstReply.id,
        },
      },
    );
  typia.assert(secondReply);
  // 7. Retrieve the top-level comment with nested replies
  const retrievedComment = await api.functional.redditClone.posts.comments.at(
    memberConnection,
    {
      postId: post.id,
      commentId: topLevelComment.id,
    },
  );
  typia.assert(retrievedComment);
  // 8. Validate the retrieved comment structure
  TestValidator.equals(
    "comment id matches",
    retrievedComment.id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "comment body matches",
    retrievedComment.body,
    topLevelCommentBody,
  );
  TestValidator.equals(
    "author username matches",
    retrievedComment.author.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "author display_name matches",
    retrievedComment.author.display_name,
    memberAuth.display_name,
  );
  TestValidator.equals("post id matches", retrievedComment.post.id, post.id);
  TestValidator.equals(
    "post title matches",
    retrievedComment.post.title,
    post.title,
  );
  TestValidator.equals(
    "post type matches",
    retrievedComment.post.post_type,
    "TEXT",
  );
  TestValidator.equals(
    "community id matches",
    retrievedComment.post.community.id,
    community.id,
  );
  TestValidator.equals(
    "parent is null for top-level",
    retrievedComment.parent,
    null,
  );
  TestValidator.predicate(
    "vote score is zero",
    retrievedComment.vote_score === 0,
  );
  TestValidator.equals("deleted_at is null", retrievedComment.deleted_at, null);
  // 9. Validate children array contains the first reply
  TestValidator.predicate("has children", retrievedComment.children.length > 0);
  const firstChild = retrievedComment.children[0];
  TestValidator.equals("first child id matches", firstChild.id, firstReply.id);
  TestValidator.equals(
    "first child body matches",
    firstChild.body,
    firstReplyBody,
  );
  TestValidator.predicate("first child has parent", firstChild.parent !== null);
  if (firstChild.parent !== null) {
    TestValidator.equals(
      "first child parent id matches",
      firstChild.parent.id,
      topLevelComment.id,
    );
  }
  // 10. Validate nested structure (grandchild in first child's children)
  TestValidator.predicate(
    "first child has children",
    firstChild.children.length > 0,
  );
  const grandchild = firstChild.children[0];
  TestValidator.equals("grandchild id matches", grandchild.id, secondReply.id);
  TestValidator.equals(
    "grandchild body matches",
    grandchild.body,
    secondReplyBody,
  );
  TestValidator.predicate("grandchild has parent", grandchild.parent !== null);
  if (grandchild.parent !== null) {
    TestValidator.equals(
      "grandchild parent id matches",
      grandchild.parent.id,
      firstReply.id,
    );
  }
}
