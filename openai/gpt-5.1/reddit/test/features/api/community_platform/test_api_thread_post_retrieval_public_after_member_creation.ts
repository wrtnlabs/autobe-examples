import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate public retrieval of a community thread post after member creation.
 *
 * Business goal: Ensure that once a member user registers, creates a community,
 * and posts a normal text thread, that thread can be retrieved via the public
 * /communityPlatform/threads/{postId} endpoint without authentication. The
 * retrieved payload must match the created post in identity and core content
 * while reflecting an active, visible, unlocked lifecycle state.
 *
 * Scenario steps:
 *
 * 1. Register a new member user using auth.memberUser.join with
 *    ICommunityPlatformMemberuser.IJoin and rely on SDK to attach Authorization
 *    to the connection.
 * 2. With the authenticated member connection, create a new community via
 *    communityPlatform.memberUser.communities.create using
 *    ICommunityPlatformCommunity.ICreate. Configure it as public/active,
 *    non-NSFW, non-quarantined, unrestricted posting, and with text posts
 *    allowed so normal threads are permitted.
 * 3. Still using the same member session, create a new post in that community via
 *    communityPlatform.memberUser.posts.create using
 *    ICommunityPlatformPost.ICreate. Supply both communityId and communityCode
 *    (slug) from the created community, set a text-style postType string (e.g.
 *    "text"), and give it a deterministic title and body string so later
 *    equality checks are stable.
 * 4. Construct an unauthenticated connection object by shallow copying the
 *    original connection but providing an empty headers object, thereby
 *    ensuring no Authorization header is sent for the public request.
 * 5. Call communityPlatform.threads.at with that unauthenticated connection and
 *    the created post's id as postId.
 * 6. Assert, via typia.assert, that the response is a valid
 *    ICommunityPlatformPost.
 * 7. Use TestValidator.equals / predicate to verify key business invariants:
 *
 *    - The retrieved id equals the created post id.
 *    - Community_id equals the created community id.
 *    - Author_memberuser_id equals the joined member user's id.
 *    - Title and body match the values used when creating the post.
 *    - Post_type and status are non-empty strings.
 *    - Is_locked is false (unlocked by default).
 *    - Deleted_at is null or undefined (not soft-deleted).
 *    - Created_at and updated_at timestamps are non-empty strings.
 * 8. By the success of the unauthenticated call and the above assertions, conclude
 *    that public thread retrieval works for visible, active posts.
 */
export async function test_api_thread_post_retrieval_public_after_member_creation(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember = await api.functional.auth.memberUser.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorizedMember);

  // 2. Create a new public, active community that allows text posts
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
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

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a new text-style post in the created community
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({ paragraphs: 1 });

  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: postTitle,
    body: postBody,
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(createdPost);

  // 4. Build an unauthenticated connection for public thread retrieval
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Publicly retrieve the thread post by its id with no Authorization
  const retrievedPost = await api.functional.communityPlatform.threads.at(
    unauthenticatedConnection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert<ICommunityPlatformPost>(retrievedPost);

  // 6. Validate identity and ownership consistency
  TestValidator.equals(
    "retrieved post id must equal created post id",
    retrievedPost.id,
    createdPost.id,
  );
  TestValidator.equals(
    "retrieved community_id must equal created community id",
    retrievedPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "retrieved author_memberuser_id must equal joined member id",
    retrievedPost.author_memberuser_id,
    authorizedMember.id,
  );

  // 7. Validate content fields
  TestValidator.equals(
    "retrieved title must equal created title",
    retrievedPost.title,
    postTitle,
  );
  TestValidator.equals(
    "retrieved body must equal created body",
    retrievedPost.body ?? null,
    postBody,
  );

  // 8. Basic lifecycle and visibility checks
  TestValidator.predicate(
    "post_type must be a non-empty string",
    retrievedPost.post_type.length > 0,
  );
  TestValidator.predicate(
    "status must be a non-empty string",
    retrievedPost.status.length > 0,
  );
  TestValidator.equals(
    "post should not be locked by default",
    retrievedPost.is_locked,
    false,
  );

  TestValidator.predicate(
    "created_at timestamp should be non-empty",
    retrievedPost.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should be non-empty",
    retrievedPost.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at should be null or undefined for active post",
    retrievedPost.deleted_at === null || retrievedPost.deleted_at === undefined,
  );
}
