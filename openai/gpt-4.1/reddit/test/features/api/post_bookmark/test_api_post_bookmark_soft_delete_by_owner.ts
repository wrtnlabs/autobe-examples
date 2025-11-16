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
 * Test that a user can soft-delete their own post bookmark.
 *
 * Steps:
 *
 * 1. Register user
 * 2. Create a community
 * 3. Create a post in community
 * 4. Bookmark the post
 * 5. Soft-delete (erase) the bookmark
 * 6. Validate deleted_at is set and bookmark is now erased
 */
export async function test_api_post_bookmark_soft_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Register user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: password as string & tags.Format<"password">,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);
  // 2. Create a community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10) as string &
          tags.MinLength<3> &
          tags.MaxLength<30>,
        display_title: RandomGenerator.paragraph({ sentences: 2 }) as string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
        description: RandomGenerator.paragraph({ sentences: 5 }) as string &
          tags.MinLength<1> &
          tags.MaxLength<2000>,
        visibility: "public",
        status: "active",
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);
  // 3. Create a post in that community
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Bookmark the post
  const bookmark =
    await api.functional.communityPlatform.user.postBookmarks.create(
      connection,
      {
        body: {
          post_id: post.id,
        } satisfies ICommunityPlatformPostBookmark.ICreate,
      },
    );
  typia.assert(bookmark);
  TestValidator.equals(
    "post in bookmark matches post id",
    bookmark.post_id,
    post.id,
  );
  TestValidator.equals(
    "bookmark should be active before erase",
    bookmark.deleted_at,
    null,
  );

  // 5. Soft-delete (erase) the bookmark
  const erased =
    await api.functional.communityPlatform.user.postBookmarks.erase(
      connection,
      {
        postBookmarkId: bookmark.id,
      },
    );
  typia.assert(erased);
  TestValidator.equals(
    "erased bookmark id matches original",
    erased.id,
    bookmark.id,
  );
  TestValidator.notEquals(
    "deleted_at should be set after erase",
    erased.deleted_at,
    null,
  );
  TestValidator.equals(
    "erased bookmark post id remains the same",
    erased.post_id,
    bookmark.post_id,
  );
  TestValidator.equals(
    "erased bookmark user id remains the same",
    erased.user_id,
    bookmark.user_id,
  );
}
