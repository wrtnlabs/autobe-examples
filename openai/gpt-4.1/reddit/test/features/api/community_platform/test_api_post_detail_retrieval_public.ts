import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * E2E test for public retrieval of a community platform post detail.
 *
 * Scenario:
 *
 * 1. Registers a new user and authenticates.
 * 2. Creates a new community for post creation.
 * 3. Creates a published text post within the created community using the
 *    authenticated user.
 * 4. Logs out to simulate public (unauthenticated) access.
 * 5. Retrieves the post detail by GET /communityPlatform/posts/{postId}.
 * 6. Validates all main fields and relationships are present; confirms enforcement
 *    of public visibility requirement.
 * 7. (Negative case for deleted/restricted posts skipped: no API to
 *    delete/restrict provided.)
 */
export async function test_api_post_detail_retrieval_public(
  connection: api.IConnection,
) {
  // Register a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: { email, password } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // Create a new community as user
  const communityInput = {
    name: RandomGenerator.alphaNumeric(12),
    display_title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 10,
    }),
    visibility: "public",
    image_url: null,
    status: "active",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityInput,
    });
  typia.assert(community);

  // Create a published text post within the community
  const postInput = {
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 14,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "published",
    community_id: community.id,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: postInput,
    });
  typia.assert(post);
  TestValidator.equals(
    "created post type = request",
    post.type,
    postInput.type,
  );
  TestValidator.equals(
    "created post title = request",
    post.title,
    postInput.title,
  );
  TestValidator.equals("created post status", post.status, postInput.status);
  TestValidator.equals(
    "created post community",
    post.community.id,
    community.id,
  );
  TestValidator.equals("no post soft-delete", post.deleted_at, null);
  TestValidator.equals("post body = input", post.body, postInput.body);

  // Prepare an unauthenticated connection (no Authorization header)
  const publicConn: api.IConnection = { ...connection, headers: {} };
  // Retrieve the post detail as public user
  const retrieved: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(publicConn, {
      postId: post.id,
    });
  typia.assert(retrieved);
  TestValidator.equals("retrieved post id is correct", retrieved.id, post.id);
  TestValidator.equals("retrieved post type", retrieved.type, postInput.type);
  TestValidator.equals(
    "retrieved post title",
    retrieved.title,
    postInput.title,
  );
  TestValidator.equals(
    "retrieved post status",
    retrieved.status,
    postInput.status,
  );
  TestValidator.equals(
    "retrieved post not soft-deleted",
    retrieved.deleted_at,
    null,
  );
  TestValidator.equals(
    "community id/ref is correct",
    retrieved.community.id,
    community.id,
  );
  TestValidator.equals("user id/ref is correct", retrieved.user.id, user.id);
  TestValidator.equals(
    "user session summary available",
    typeof retrieved.userSession.id,
    "string",
  );
  TestValidator.predicate(
    "created_at is ISO8601",
    typeof retrieved.created_at === "string" &&
      retrieved.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO8601",
    typeof retrieved.updated_at === "string" &&
      retrieved.updated_at.includes("T"),
  );
}
