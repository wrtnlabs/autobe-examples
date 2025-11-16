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
 * Validates that an authenticated user can successfully retrieve details for a
 * specific post bookmark they own.
 *
 * Business context:
 *
 * - Users can bookmark posts for personal reference, and these bookmarks are
 *   private assets of their account.
 * - Retrieving a bookmark by its ID should only succeed for the user who owns it.
 *
 * Test workflow:
 *
 * 1. Register (join) a user account and ensure authenticated session
 * 2. Create a new community with random metadata
 * 3. Create a new post within that community
 * 4. Bookmark the post using the user's authentication
 * 5. Retrieve the bookmark by its ID
 * 6. Assert all bookmark fields and relationships are correct (user, post
 *    association, IDs match, timestamps present)
 * 7. Assert that the bookmark user_id matches the authenticated user, post_id
 *    matches the post, and returned data structure matches type
 */
export async function test_api_post_bookmark_retrieval_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register (join) user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.Format<"password">>();
  const authorized: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(authorized);

  // 2. Create a community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 12,
    }),
    visibility: "public",
    status: "active",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);
  TestValidator.equals(
    "requested community name matches response",
    community.name,
    communityBody.name,
  );
  TestValidator.equals(
    "requested display title matches response",
    community.display_title,
    communityBody.display_title,
  );

  // 3. Create a post in that community
  const postBody = {
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    status: "published",
    community_id: community.id,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "community_id in post matches created community",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "title in post matches requested",
    post.title,
    postBody.title,
  );
  TestValidator.equals(
    "type in post matches requested",
    post.type,
    postBody.type,
  );

  // 4. Bookmark the post
  const bookmarkBody = {
    post_id: post.id,
  } satisfies ICommunityPlatformPostBookmark.ICreate;
  const bookmark: ICommunityPlatformPostBookmark =
    await api.functional.communityPlatform.user.postBookmarks.create(
      connection,
      { body: bookmarkBody },
    );
  typia.assert(bookmark);
  TestValidator.equals(
    "bookmark post_id matches post",
    bookmark.post_id,
    post.id,
  );
  TestValidator.equals(
    "bookmark user_id matches user",
    bookmark.user_id,
    authorized.id,
  );

  // 5. Retrieve the bookmark by ID
  const loaded: ICommunityPlatformPostBookmark =
    await api.functional.communityPlatform.user.postBookmarks.at(connection, {
      postBookmarkId: bookmark.id,
    });
  typia.assert(loaded);
  TestValidator.equals(
    "retrieved bookmark id matches created bookmark",
    loaded.id,
    bookmark.id,
  );
  TestValidator.equals(
    "retrieved bookmark user_id matches",
    loaded.user_id,
    authorized.id,
  );
  TestValidator.equals(
    "retrieved bookmark post_id matches",
    loaded.post_id,
    post.id,
  );
  TestValidator.equals(
    "created_at must be present",
    typeof loaded.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at must be present",
    typeof loaded.updated_at,
    "string",
  );
  TestValidator.equals(
    "deleted_at should be null or undefined for active bookmark",
    loaded.deleted_at ?? null,
    null,
  );
}
