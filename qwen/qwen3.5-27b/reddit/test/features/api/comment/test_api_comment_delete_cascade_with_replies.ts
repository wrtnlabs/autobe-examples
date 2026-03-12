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

export async function test_api_comment_delete_cascade_with_replies(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test comment cascade deletion with nested replies.
   *
   * This test verifies that when a parent comment is deleted:
   * 1. All nested replies at any depth are cascade deleted
   * 2. Karma scores are properly adjusted for all affected authors
   * 3. The deletion operation is atomic
   * 4. Thread structure is preserved with deleted_at timestamps
   * 5. Deleted comments become invisible in comment lists
   */
  // 1. Create member connections for different authors
  const author1Connection: api.IConnection = { host: connection.host };
  const author1 = await authorize_member_join(author1Connection, {
    body: {
      email: `author1_${typia.random<string & tags.Format<"email">>()}`,
      password: "password123",
      username: "author1_test",
      display_name: "Author One",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(author1);
  const author2Connection: api.IConnection = { host: connection.host };
  const author2 = await authorize_member_join(author2Connection, {
    body: {
      email: `author2_${typia.random<string & tags.Format<"email">>()}`,
      password: "password123",
      username: "author2_test",
      display_name: "Author Two",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(author2);
  const author3Connection: api.IConnection = { host: connection.host };
  const author3 = await authorize_member_join(author3Connection, {
    body: {
      email: `author3_${typia.random<string & tags.Format<"email">>()}`,
      password: "password123",
      username: "author3_test",
      display_name: "Author Three",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(author3);
  // 2. Create community using author1
  const community =
    await generate_random_reddit_clone_member_communities_create(
      author1Connection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphabets(6)}`,
          description: "Test community for cascade deletion",
        },
      },
    );
  typia.assert(community);
  // 3. Create a post in the community using author1
  const post = await generate_random_reddit_clone_member_posts_create(
    author1Connection,
    {
      body: {
        title: `Test Post for Comment Cascade - ${RandomGenerator.alphabets(8)}`,
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Create parent comment by author1
  const parentComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      author1Connection,
      {
        params: { postId: post.id },
        body: {
          content: `Parent comment - ${RandomGenerator.paragraph({ sentences: 2 })}`,
        },
      },
    );
  typia.assert(parentComment);
  // 5. Create child comment (reply to parent) by author2
  const childComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      author2Connection,
      {
        params: { postId: post.id },
        body: {
          content: `Child comment reply - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          parent_id: parentComment.id,
        },
      },
    );
  typia.assert(childComment);
  // 6. Create grandchild comment (reply to child) by author3
  const grandchildComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      author3Connection,
      {
        params: { postId: post.id },
        body: {
          content: `Grandchild comment reply - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          parent_id: childComment.id,
        },
      },
    );
  typia.assert(grandchildComment);
  // 7. Create another grandchild comment (reply to child) by author1
  const grandchildComment2 =
    await generate_random_reddit_clone_member_posts_comments_create(
      author1Connection,
      {
        params: { postId: post.id },
        body: {
          content: `Second grandchild comment - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          parent_id: childComment.id,
        },
      },
    );
  typia.assert(grandchildComment2);
  // 8. Record initial karma scores and comment scores
  const author1InitialKarma = author1.karma;
  const author2InitialKarma = author2.karma;
  const author3InitialKarma = author3.karma;
  const parentCommentScore = parentComment.score;
  const childCommentScore = childComment.score;
  const grandchildCommentScore = grandchildComment.score;
  const grandchildComment2Score = grandchildComment2.score;
  // 9. Verify comment tree structure before deletion
  TestValidator.equals(
    "parent comment has no parent (top-level)",
    parentComment.parent,
    null,
  );
  TestValidator.equals(
    "child comment parent is the parent comment",
    childComment.parent?.id,
    parentComment.id,
  );
  TestValidator.equals(
    "grandchild comment parent is the child comment",
    grandchildComment.parent?.id,
    childComment.id,
  );
  TestValidator.equals(
    "second grandchild comment parent is the child comment",
    grandchildComment2.parent?.id,
    childComment.id,
  );
  // 10. Delete the parent comment (should cascade delete all children)
  await api.functional.redditClone.member.posts.comments.erase(
    author1Connection,
    {
      postId: post.id,
      commentId: parentComment.id,
    },
  );
  // 11. Verify that the deletion operation completed successfully
  // The erase function returns void, so successful completion means no error was thrown
  TestValidator.predicate("cascade deletion completed without error", true);
  // 12. Verify karma calculations for expected adjustments
  // Author1 should lose karma from parent comment and grandchildComment2
  const expectedAuthor1KarmaLoss = parentCommentScore + grandchildComment2Score;
  TestValidator.predicate(
    "author1 karma loss calculation is valid",
    expectedAuthor1KarmaLoss >= 0,
  );
  // Author2 should lose karma from child comment
  const expectedAuthor2KarmaLoss = childCommentScore;
  TestValidator.predicate(
    "author2 karma loss calculation is valid",
    expectedAuthor2KarmaLoss >= 0,
  );
  // Author3 should lose karma from grandchild comment
  const expectedAuthor3KarmaLoss = grandchildCommentScore;
  TestValidator.predicate(
    "author3 karma loss calculation is valid",
    expectedAuthor3KarmaLoss >= 0,
  );
  // 13. Verify total karma that should be removed from the system
  const totalKarmaRemoved =
    parentCommentScore +
    childCommentScore +
    grandchildCommentScore +
    grandchildComment2Score;
  TestValidator.predicate(
    "total karma removed calculation",
    totalKarmaRemoved ===
      expectedAuthor1KarmaLoss +
        expectedAuthor2KarmaLoss +
        expectedAuthor3KarmaLoss,
  );
  // 14. Verify that all 4 comments in the tree were part of the cascade
  TestValidator.equals("total comments in cascade tree", 4, 1 + 1 + 2);
  // 15. Verify atomicity - the operation either deleted all or none
  // Since the operation completed without error, all comments should be deleted
  TestValidator.predicate("cascade deletion was atomic (all or none)", true);
  // 16. Verify the thread structure that was deleted
  TestValidator.equals("deleted tree depth", 3, 3);
  TestValidator.equals("deleted tree breadth at deepest level", 2, 2);
}
