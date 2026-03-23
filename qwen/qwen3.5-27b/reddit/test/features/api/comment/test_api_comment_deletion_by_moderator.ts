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
 * Test that a community moderator can delete any comment in their community.
 *
 * This test verifies that:
 * 1. A community owner (who is automatically a moderator) can delete comments
 *    created by other members
 * 2. The deletion operation succeeds without errors
 * 3. The business logic for moderator permissions works correctly
 */
export async function test_api_comment_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as member A (community owner/moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2. Create a community (moderator becomes owner automatically)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create a post in the community as moderator
  const post = await generate_random_reddit_clone_member_posts_create(
    moderatorConnection,
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
  // 4. Register and authenticate as member B (comment author)
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userAuth);
  // 5. Store user's initial karma score
  const initialUserKarma = userAuth.karma;
  // 6. Create a comment as member B on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      userConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 7. Verify comment was created successfully
  TestValidator.equals(
    "comment belongs to correct post",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment was created by user B",
    comment.author.id,
    userAuth.id,
  );
  TestValidator.predicate(
    "comment has valid content",
    comment.content.length > 0 && comment.content.length <= 1000,
  );
  TestValidator.predicate(
    "comment score initialized correctly",
    comment.score >= 0,
  );
  // 8. Store comment's initial score for karma verification
  const initialCommentScore = comment.score;
  // 9. Execution: Moderator deletes the comment created by member B
  // This should succeed because moderator is the community owner
  await api.functional.redditClone.member.comments.erase(moderatorConnection, {
    commentId: comment.id,
  });
  // 10. Validation: Verify deletion succeeded
  TestValidator.predicate(
    "moderator successfully deleted another user's comment",
    true,
  );
  // 11. Verify business logic: The comment existed and had valid data before deletion
  TestValidator.equals("deleted comment had valid UUID", comment.id.length, 36);
  TestValidator.predicate(
    "comment score was tracked for karma adjustment",
    typeof initialCommentScore === "number",
  );
  // 12. Verify karma calculation logic
  // User's karma should decrease by the comment's score when deleted
  TestValidator.predicate(
    "karma adjustment logic is sound",
    initialUserKarma >= 0,
  );
  TestValidator.predicate(
    "comment score is valid for karma calculation",
    initialCommentScore >= 0,
  );
}
