import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostBookmark";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Validate restoring a user's post bookmark after performing a soft-delete.
 *
 * Test steps:
 *
 * 1. Register a new user.
 * 2. Create a new community as the user.
 * 3. Create a new post in the community as the user.
 * 4. Bookmark the post as the user.
 * 5. Soft-delete the bookmark (DELETE endpoint).
 * 6. Restore the bookmark by updating its deleted_at to null (PUT endpoint).
 * 7. Verify via the PUT response that the bookmark is restored (deleted_at is
 *    null).
 * 8. Check audit fields (updated_at is newer, created_at unchanged, user/post
 *    references intact).
 */
export async function test_api_post_bookmark_restore_after_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(userAuth);

  // 2. Create a community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
      wordMin: 6,
      wordMax: 15,
    }),
    visibility: "public",
    status: "active",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Create a post in the community
  const postBody = {
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "published",
    community_id: community.id,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // 4. Bookmark the post
  const bookmarkCreateBody = {
    post_id: post.id,
  } satisfies ICommunityPlatformPostBookmark.ICreate;
  const bookmark =
    await api.functional.communityPlatform.user.postBookmarks.create(
      connection,
      { body: bookmarkCreateBody },
    );
  typia.assert(bookmark);
  TestValidator.equals(
    "Bookmark initially active (deleted_at null)",
    bookmark.deleted_at,
    null,
  );

  // 5. Soft-delete (erase) the bookmark
  const erasedBookmark =
    await api.functional.communityPlatform.user.postBookmarks.erase(
      connection,
      { postBookmarkId: bookmark.id },
    );
  typia.assert(erasedBookmark);
  TestValidator.predicate(
    "Bookmark deleted_at is not null after erase",
    typeof erasedBookmark.deleted_at === "string" &&
      erasedBookmark.deleted_at.length > 0,
  );

  // 6. Restore the bookmark (deleted_at -> null)
  const updatedBookmark =
    await api.functional.communityPlatform.user.postBookmarks.update(
      connection,
      {
        postBookmarkId: bookmark.id,
        body: {
          deleted_at: null,
        } satisfies ICommunityPlatformPostBookmark.IUpdate,
      },
    );
  typia.assert(updatedBookmark);
  TestValidator.equals(
    "Bookmark restored (deleted_at null after update)",
    updatedBookmark.deleted_at,
    null,
  );

  // 7. Validate audit fields and references
  TestValidator.equals(
    "Bookmark post_id preserved",
    updatedBookmark.post_id,
    bookmark.post_id,
  );
  TestValidator.equals(
    "Bookmark user_id preserved",
    updatedBookmark.user_id,
    bookmark.user_id,
  );
  TestValidator.equals(
    "Bookmark created_at unchanged",
    updatedBookmark.created_at,
    bookmark.created_at,
  );
  TestValidator.predicate(
    "updated_at has changed after restore",
    updatedBookmark.updated_at !== bookmark.updated_at,
  );
}
