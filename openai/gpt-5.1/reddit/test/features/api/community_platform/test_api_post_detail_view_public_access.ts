import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate public access to community post detail view.
 *
 * Business goal: Ensure that a community post created by an authenticated
 * member user can be retrieved through the public GET
 * /communityPlatform/posts/{postId} endpoint without any Authorization header,
 * and that the returned representation matches the created post's core fields.
 *
 * Workflow:
 *
 * 1. Register a new member user via POST /auth/memberUser/join.
 *
 *    - This both creates the member account and configures the SDK connection with
 *         the Authorization header via the returned token.
 * 2. As the authenticated member user, create a new community via POST
 *    /communityPlatform/memberUser/communities.
 * 3. As the same member user, create a new text post in that community via POST
 *    /communityPlatform/memberUser/posts.
 * 4. Clone the connection into a new publicConnection with empty headers,
 *    simulating a completely unauthenticated client.
 * 5. Call GET /communityPlatform/posts/{postId} using publicConnection to retrieve
 *    the created post by its id.
 *
 * Validations:
 *
 * - All write operations (join, create community, create post) succeed and return
 *   DTOs matching their declared types (validated by typia.assert).
 * - The post creation response has a community_id equal to the created
 *   community.id and reasonable initial state (is_locked should be false,
 *   deleted_at should be null or undefined, status is non-empty).
 * - The public GET response:
 *
 *   - Has the same id as the created post.
 *   - Has matching community_id, title, body, link_url, image_url, status, and
 *       is_locked fields.
 *   - Has deleted_at still null/undefined, confirming that the post is not
 *       soft-deleted.
 * - Because publicConnection carries no Authorization header, successful GET
 *   implies that the endpoint permits unauthenticated access for a normal
 *   visible post (no 401/403 is raised).
 */
export async function test_api_post_detail_view_public_access(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a new community as this member user
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a new text post in the created community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(createdPost);

  // Business-level validations on the created post
  TestValidator.equals(
    "created post community_id equals community.id",
    createdPost.community_id,
    community.id,
  );

  TestValidator.predicate(
    "created post status should be non-empty",
    createdPost.status.length > 0,
  );

  TestValidator.predicate(
    "created post is initially unlocked",
    createdPost.is_locked === false,
  );

  TestValidator.predicate(
    "created post deleted_at is null or undefined",
    createdPost.deleted_at === null || createdPost.deleted_at === undefined,
  );

  // 4. Prepare an unauthenticated connection for public access
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Retrieve the post via public GET detail endpoint
  const publicPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(publicConnection, {
      postId: createdPost.id,
    });
  typia.assert(publicPost);

  // Cross-validate core fields between creation and public retrieval
  TestValidator.equals(
    "public post id matches created post id",
    publicPost.id,
    createdPost.id,
  );

  TestValidator.equals(
    "public post community_id matches",
    publicPost.community_id,
    createdPost.community_id,
  );

  TestValidator.equals(
    "public post author_memberuser_id matches",
    publicPost.author_memberuser_id,
    createdPost.author_memberuser_id,
  );

  TestValidator.equals(
    "public post title matches",
    publicPost.title,
    createdPost.title,
  );

  TestValidator.equals(
    "public post body matches",
    publicPost.body,
    createdPost.body,
  );

  TestValidator.equals(
    "public post link_url matches",
    publicPost.link_url,
    createdPost.link_url,
  );

  TestValidator.equals(
    "public post image_url matches",
    publicPost.image_url,
    createdPost.image_url,
  );

  TestValidator.equals(
    "public post status matches",
    publicPost.status,
    createdPost.status,
  );

  TestValidator.equals(
    "public post is_locked matches",
    publicPost.is_locked,
    createdPost.is_locked,
  );

  TestValidator.predicate(
    "public post deleted_at is null or undefined",
    publicPost.deleted_at === null || publicPost.deleted_at === undefined,
  );
}
