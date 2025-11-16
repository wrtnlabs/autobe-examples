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
 * Validates successful creation of a post bookmark by a newly registered user.
 *
 * This test covers the business workflow where a user signs up, creates a
 * community, creates a post in that community, and then bookmarks the post. The
 * flow ensures:
 *
 * 1. The user is authenticated via self-registration.
 * 2. The user is able to create a new community (with unique slug, display title,
 *    and description).
 * 3. The user is able to author a post in the community (with unique title, as
 *    "text" type).
 * 4. The user can create a bookmark for the post they just authored.
 * 5. The bookmark returned by the API matches the (user_id, post_id) relationship,
 *    has null deleted_at, and contains created/updated timestamps.
 * 6. Bookmark uniqueness: a single user cannot create two active bookmarks for the
 *    same post.
 * 7. All responses are strictly type-checked and validated with typia.assert().
 *
 * Steps:
 *
 * - Register a new user with random email and password.
 * - Create a new community as that user (random name and metadata).
 * - Create a new text post within the community as that user.
 * - Create a post bookmark for the post.
 * - Validate business relationships (user_id, post_id), status, and timestamp
 *   fields.
 * - Attempt to create another bookmark for the same (user, post) pair and check
 *   logical uniqueness via notEquals or by receiving the same record result.
 */
export async function test_api_post_bookmark_creation_successful(
  connection: api.IConnection,
) {
  // Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: password,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // Create a new community
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communitySlug as string & tags.MinLength<3> & tags.MaxLength<30>,
        display_title: RandomGenerator.paragraph({ sentences: 2 }) as string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 12,
          wordMin: 3,
          wordMax: 8,
        }) as string & tags.MinLength<1> & tags.MaxLength<2000>,
        visibility: "public",
        status: "active",
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Bookmark the post
  const bookmark: ICommunityPlatformPostBookmark =
    await api.functional.communityPlatform.user.postBookmarks.create(
      connection,
      {
        body: {
          post_id: post.id,
        } satisfies ICommunityPlatformPostBookmark.ICreate,
      },
    );
  typia.assert(bookmark);

  // Validate bookmark fields
  TestValidator.equals(
    "bookmark user_id matches current user",
    bookmark.user_id,
    user.id,
  );
  TestValidator.equals(
    "bookmark post_id matches post.id",
    bookmark.post_id,
    post.id,
  );
  TestValidator.equals(
    "bookmark deleted_at must be null (active)",
    bookmark.deleted_at,
    null,
  );
  TestValidator.predicate(
    "bookmark created_at is ISO string",
    typeof bookmark.created_at === "string" &&
      !!Date.parse(bookmark.created_at),
  );
  TestValidator.predicate(
    "bookmark updated_at is ISO string",
    typeof bookmark.updated_at === "string" &&
      !!Date.parse(bookmark.updated_at),
  );

  // Uniqueness test: re-bookmark same post, verify upsert logic (should not create duplicate)
  const bookmarkAgain: ICommunityPlatformPostBookmark =
    await api.functional.communityPlatform.user.postBookmarks.create(
      connection,
      {
        body: {
          post_id: post.id,
        } satisfies ICommunityPlatformPostBookmark.ICreate,
      },
    );
  typia.assert(bookmarkAgain);
  // Should return the same record (same id), not a duplicate bookmark
  TestValidator.equals(
    "bookmarking same post again returns same id",
    bookmarkAgain.id,
    bookmark.id,
  );
}
