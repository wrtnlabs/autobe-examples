import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test: Permanent deletion of a user's own comment, with audit and error paths.
 *
 * 1. User registration (obtain auth token via join)
 * 2. Create new community
 * 3. Create post within community
 * 4. Add a comment as post author
 * 5. Attempt deletion as comment author (should succeed)
 * 6. Attempt deletion of already deleted comment (should error)
 * 7. Attempt deletion as another user (should error)
 * 8. Additional: Try deleting a truly non-existent commentId
 */
export async function test_api_comment_deletion_by_author_user(
  connection: api.IConnection,
) {
  // 1. Register user (author)
  const userEmail = RandomGenerator.alphaNumeric(8) + "@test.com";
  const userJoinBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://test.com/register",
    referrer: "https://test.com/ref/abcd",
  } satisfies ICommunityPlatformUser.IJoin;
  const author: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(author);

  // 2. Create new community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(12).toLowerCase(),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 12,
        }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create post in the community
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3, wordMin: 6 }),
        text_body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 12,
          sentenceMax: 24,
          wordMin: 4,
          wordMax: 12,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create comment
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 8,
          wordMax: 18,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 5. Delete the comment as author
  await api.functional.communityPlatform.user.comments.erase(connection, {
    commentId: comment.id,
  });

  // 6. Attempt to delete already deleted comment (should error)
  await TestValidator.error(
    "deleting already deleted comment fails",
    async () => {
      await api.functional.communityPlatform.user.comments.erase(connection, {
        commentId: comment.id,
      });
    },
  );

  // 7. Register alternate user
  const altEmail = RandomGenerator.alphaNumeric(8) + "@test.com";
  const altJoinBody = {
    email: altEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://test.com/register",
    referrer: "https://test.com/ref/abcd",
  } satisfies ICommunityPlatformUser.IJoin;
  const alt: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: altJoinBody,
    });
  typia.assert(alt);

  // 8. Attempt to delete previously deleted comment as another user
  await TestValidator.error(
    "other user cannot delete deleted comment",
    async () => {
      await api.functional.communityPlatform.user.comments.erase(connection, {
        commentId: comment.id,
      });
    },
  );

  // 9. Attempt to delete truly non-existent comment
  const nonexistentCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("deleting non-existent comment fails", async () => {
    await api.functional.communityPlatform.user.comments.erase(connection, {
      commentId: nonexistentCommentId,
    });
  });
}
