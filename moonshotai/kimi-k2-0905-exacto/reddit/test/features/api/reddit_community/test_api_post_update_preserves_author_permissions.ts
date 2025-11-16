import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

export async function test_api_post_update_preserves_author_permissions(
  connection: api.IConnection,
) {
  // Step 1: Create first member (original author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = RandomGenerator.alphaNumeric(12);
  const author = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: authorEmail,
      password: authorPassword,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(author);

  // Step 2: Create second member (non-author) using fresh connection
  const otherConnection: api.IConnection = { ...connection, headers: {} };
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = RandomGenerator.alphaNumeric(12);
  const otherMember = await api.functional.auth.member.join(otherConnection, {
    body: {
      nickname: RandomGenerator.name(),
      email: otherEmail,
      password: otherPassword,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(otherMember);

  // Step 3: First member creates a post
  const randomCommunityId = typia.random<string & tags.Format<"uuid">>();
  const randomPostTypeId = typia.random<string & tags.Format<"uuid">>();

  const originalPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_id: randomCommunityId,
        reddit_post_type_id: randomPostTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(originalPost);

  // Step 4: Verify original author can update their own post
  const updatedTitle =
    "Updated: " + RandomGenerator.paragraph({ sentences: 2 });
  const authorUpdatedPost =
    await api.functional.redditCommunity.member.posts.update(connection, {
      postId: originalPost.id,
      body: {
        title: updatedTitle,
      } satisfies IRedditCommunityPost.IUpdate,
    });
  typia.assert(authorUpdatedPost);

  TestValidator.equals(
    "Author should successfully update their own post",
    authorUpdatedPost.title,
    updatedTitle,
  );
  TestValidator.equals(
    "Post ID should remain the same after update",
    authorUpdatedPost.id,
    originalPost.id,
  );

  // Step 5: Verify second member cannot update someone else's post
  await TestValidator.error(
    "Other member should not be able to update posts they don't own",
    async () => {
      await api.functional.redditCommunity.member.posts.update(
        otherConnection,
        {
          postId: originalPost.id,
          body: {
            title: "Hacked: Unauthorized Update Attempt",
          } satisfies IRedditCommunityPost.IUpdate,
        },
      );
    },
  );

  // Step 6: Verify author can still update after unauthorized attempt
  const finalUpdate =
    "Final Update: " + RandomGenerator.paragraph({ sentences: 2 });
  const finalPost = await api.functional.redditCommunity.member.posts.update(
    connection,
    {
      postId: originalPost.id,
      body: {
        title: finalUpdate,
        content: "Content updated after security test completed",
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(finalPost);

  TestValidator.equals(
    "Original author should still be able to update after unauthorized attempts",
    finalPost.title,
    finalUpdate,
  );
}
