import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test that only the original comment author can update their comment.
 *
 * This test validates the ownership-based authorization system for comment
 * updates in the Reddit Community platform. We create two distinct members,
 * establish authenticated sessions for both, and verify that:
 *
 * 1. The first member successfully creates a comment on a post
 * 2. The second member's attempt to update that comment fails due to lack of
 *    ownership
 *
 * The test demonstrates proper security enforcement where only the original
 * author has modification rights, preventing unauthorized edits and maintaining
 * content integrity in the community discussion system.
 *
 * Step-by-step process:
 *
 * 1. Create first member who will be the comment author
 * 2. Create a post within a community for comment creation
 * 3. Create a comment using the first member's credentials
 * 4. Register second member who will attempt unauthorized modification
 * 5. Switch to second member's authentication context
 * 6. Attempt to update first member's comment, expecting failure
 * 7. Verify authorization error occurs as expected
 */
export async function test_api_comment_update_prevents_unauthorized_modification(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member who will create the comment
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorMember: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name(),
        email: authorEmail,
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(authorMember);

  // Step 2: Create a post for comment creation
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 3: Create comment using first member's credentials
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.comments.create(connection, {
      body: {
        content: RandomGenerator.content({ paragraphs: 1 }),
        reddit_post_id: post.id,
        href: "https://example.com/test",
        referrer: "https://example.com/test",
      } satisfies IRedditCommunityComment.ICreate,
    });
  typia.assert(comment);

  // Step 4: Create second member who will attempt unauthorized update
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherMember: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name(),
        email: otherEmail,
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(otherMember);

  // Step 5: Switch to second member's authentication context
  // The SDK automatically handles authentication switching during join

  // Step 6: Attempt to update first member's comment (expected to fail)
  await TestValidator.error(
    "only comment author can update their own comment",
    async () => {
      await api.functional.redditCommunity.member.comments.update(connection, {
        commentId: comment.id,
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IRedditCommunityComment.IUpdate,
      });
    },
  );
}
