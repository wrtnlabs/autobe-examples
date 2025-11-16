import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify that a memberUser author can successfully update their own post.
 *
 * Business workflow validated by this test:
 *
 * 1. Register and authenticate a new memberUser using auth.memberUser.join. The
 *    SDK automatically stores the returned access token into the connection so
 *    subsequent memberUser endpoints run as this actor.
 * 2. Create a community with communityPlatform.memberUser.communities.create,
 *    ensuring basic flags are enabled for both text and link posts.
 * 3. Create an initial post in that community with
 *    communityPlatform.memberUser.posts.create using an
 *    ICommunityPlatformPost.ICreate body that sets both a body (text content)
 *    and a URL (link content).
 * 4. Call communityPlatform.memberUser.posts.update with the created postId and an
 *    ICommunityPlatformPost.IUpdate payload that changes mutable fields:
 *
 *    - Title (string)
 *    - Body (string | null)
 *    - Link_url ((string & tags.Format<"uri">) | null)
 *    - Is_locked (boolean)
 * 5. Assert that the update succeeds and returns an ICommunityPlatformPost whose
 *    identifiers and creation metadata are unchanged while the mutable fields
 *    reflect the update payload.
 *
 * Concrete validation rules:
 *
 * - Step 3: the created post must have:
 *
 *   - Community_id equal to the created community.id
 *   - Author_memberuser_id equal to the joined memberUser.id
 *   - Title equal to the create payload title
 *   - Post_type equal to the create payload postType (or at least non-empty)
 *   - Created_at and updated_at populated as valid date-time strings
 * - Step 4: after update, the returned post must:
 *
 *   - Keep the same id as the original post
 *   - Keep the same community_id and author_memberuser_id
 *   - Keep the same created_at value as the original post
 *   - Not change deleted_at (both should be null/undefined in this happy-path)
 *   - Have title, body, link_url, and is_locked values equal to those provided in
 *       the ICommunityPlatformPost.IUpdate request body
 *   - Have updated_at later than the original post.updated_at
 *
 * Implementation details and constraints:
 *
 * - Use only the imported DTO types and SDK functions; do not introduce
 *   additional imports.
 * - Do not access or modify connection.headers directly; rely on the SDK's
 *   automatic token handling after join.
 * - Use typia.random to generate realistic random values that satisfy tagged
 *   constraints (email, uri, etc.).
 * - Use TestValidator.equals/predicate with descriptive titles for assertions.
 */
export async function test_api_post_update_by_author_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community for this member user
  const communityBody = {
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community slug should match create payload",
    community.slug,
    communityBody.slug,
  );
  TestValidator.equals(
    "community name should match create payload",
    community.name,
    communityBody.name,
  );

  // 3. Create an initial post within the created community
  const createPostBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 3 }),
    url: typia.random<string & tags.Format<"uri">>(),
    postType: "link",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: createPostBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community_id should equal created community id",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author_memberuser_id should equal joined member id",
    post.author_memberuser_id,
    member.id,
  );
  TestValidator.equals(
    "post title should equal create payload title",
    post.title,
    createPostBody.title,
  );
  TestValidator.predicate(
    "post created_at should be non-empty",
    !!post.created_at,
  );
  TestValidator.predicate(
    "post updated_at should be non-empty",
    !!post.updated_at,
  );

  // Capture original immutable fields and timestamps
  const originalId: string = post.id;
  const originalCommunityId: string = post.community_id;
  const originalAuthorId: string = post.author_memberuser_id;
  const originalCreatedAt: string = post.created_at;
  const originalUpdatedAt: string = post.updated_at;
  const originalDeletedAt: string | null | undefined = post.deleted_at;

  // 4. Update post mutable fields via memberUser posts.update
  const updatedTitle = `${post.title} (edited)`;
  const updatedBody = RandomGenerator.paragraph({ sentences: 4 });
  const updatedLinkUrl = typia.random<string & tags.Format<"uri">>();
  const updatedIsLocked = true;

  const updateBody = {
    title: updatedTitle,
    body: updatedBody,
    link_url: updatedLinkUrl,
    is_locked: updatedIsLocked,
  } satisfies ICommunityPlatformPost.IUpdate;

  const updated: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.update(connection, {
      postId: post.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 5. Validate structural invariants
  TestValidator.equals(
    "updated post id should remain unchanged",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "updated post community_id should remain unchanged",
    updated.community_id,
    originalCommunityId,
  );
  TestValidator.equals(
    "updated post author_memberuser_id should remain unchanged",
    updated.author_memberuser_id,
    originalAuthorId,
  );
  TestValidator.equals(
    "updated post created_at should remain unchanged",
    updated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "updated post deleted_at should remain unchanged",
    updated.deleted_at ?? null,
    originalDeletedAt ?? null,
  );

  // Validate mutable fields reflect the update payload
  TestValidator.equals(
    "updated title should match update payload",
    updated.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated body should match update payload",
    updated.body ?? null,
    updatedBody,
  );
  TestValidator.equals(
    "updated link_url should match update payload",
    updated.link_url ?? null,
    updatedLinkUrl,
  );
  TestValidator.equals(
    "updated is_locked should match update payload",
    updated.is_locked,
    updatedIsLocked,
  );

  // Validate updated_at has advanced relative to original updated_at
  const originalUpdatedAtMs = Date.parse(originalUpdatedAt);
  const updatedUpdatedAtMs = Date.parse(updated.updated_at);
  TestValidator.predicate(
    "updated_at should be greater than or equal to original updated_at",
    updatedUpdatedAtMs >= originalUpdatedAtMs,
  );

  // Business rule sanity checks around post_type and link_url
  TestValidator.predicate(
    "post_type should be non-empty string",
    typeof updated.post_type === "string" && updated.post_type.length > 0,
  );
  if (updated.post_type === "link") {
    TestValidator.predicate(
      "link post should have a non-null link_url",
      !!updated.link_url,
    );
  }
}
