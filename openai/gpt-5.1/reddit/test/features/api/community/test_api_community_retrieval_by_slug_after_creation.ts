import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate public retrieval of a community by slug after authenticated
 * creation.
 *
 * Business workflow:
 *
 * 1. A guest registers as a community platform member user using the memberUser
 *    join endpoint. This returns an authorized member user plus JWT token,
 *    which the SDK automatically attaches to the connection.
 * 2. Using that authenticated memberUser context, the test creates a new community
 *    via /communityPlatform/memberUser/communities with a deterministic, known
 *    slug and a full set of configuration flags.
 * 3. The test asserts that the creation response is a valid
 *    ICommunityPlatformCommunity, and that its fields reflect the input payload
 *    (slug, name, description, visibility, status, flags), while
 *    owner_memberuser_id is present and non-empty.
 * 4. The test then simulates a public (unauthenticated) caller by cloning the
 *    connection and overriding headers to an empty object. Using this public
 *    connection, it calls GET /communityPlatform/communities/{communitySlug}
 *    with the slug used during creation.
 * 5. Finally, the test validates that the retrieved community matches the created
 *    one for all relevant business fields (id, slug, name, description,
 *    visibility, status, boolean flags, owner_memberuser_id), proving that the
 *    slug-based lookup exposes the same record to public consumers as the
 *    memberUser-facing creation API.
 */
export async function test_api_community_retrieval_by_slug_after_creation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser via join
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember = await api.functional.auth.memberUser.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorizedMember);

  // 2. Create a community with a deterministic slug under that memberUser
  const slugSuffix = RandomGenerator.alphaNumeric(8);
  const communitySlug = `retrieval-test-slug-${slugSuffix}`;

  const createBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(createdCommunity);

  // Basic sanity checks tying response back to request and member
  TestValidator.equals(
    "created community slug matches request",
    createdCommunity.slug,
    communitySlug,
  );
  TestValidator.equals(
    "created community name matches request",
    createdCommunity.name,
    createBody.name,
  );
  TestValidator.equals(
    "created community description matches request",
    createdCommunity.description,
    createBody.description,
  );
  TestValidator.equals(
    "created community visibility matches request",
    createdCommunity.visibility,
    createBody.visibility,
  );
  TestValidator.equals(
    "created community status matches request",
    createdCommunity.status,
    createBody.status,
  );
  TestValidator.equals(
    "created community is_nsfw flag matches request",
    createdCommunity.is_nsfw,
    createBody.is_nsfw,
  );
  TestValidator.equals(
    "created community is_quarantined flag matches request",
    createdCommunity.is_quarantined,
    createBody.is_quarantined,
  );
  TestValidator.equals(
    "created community is_posting_restricted flag matches request",
    createdCommunity.is_posting_restricted,
    createBody.is_posting_restricted,
  );
  TestValidator.equals(
    "created community allow_text_posts flag matches request",
    createdCommunity.allow_text_posts,
    createBody.allow_text_posts,
  );
  TestValidator.equals(
    "created community allow_link_posts flag matches request",
    createdCommunity.allow_link_posts,
    createBody.allow_link_posts,
  );
  TestValidator.equals(
    "created community allow_image_posts flag matches request",
    createdCommunity.allow_image_posts,
    createBody.allow_image_posts,
  );

  TestValidator.predicate(
    "created community has non-empty id",
    createdCommunity.id.length > 0,
  );
  TestValidator.predicate(
    "created community owner_memberuser_id is non-empty",
    createdCommunity.owner_memberuser_id.length > 0,
  );

  // 3. Simulate a public, unauthenticated connection and retrieve by slug
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const retrievedCommunity =
    await api.functional.communityPlatform.communities.at(publicConnection, {
      communitySlug,
    });
  typia.assert<ICommunityPlatformCommunity>(retrievedCommunity);

  // 4. Assert that the retrieved community matches the created one on
  // business-critical fields
  TestValidator.equals(
    "retrieved community id matches created id",
    retrievedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "retrieved community slug matches created slug",
    retrievedCommunity.slug,
    createdCommunity.slug,
  );
  TestValidator.equals(
    "retrieved community name matches created name",
    retrievedCommunity.name,
    createdCommunity.name,
  );
  TestValidator.equals(
    "retrieved community description matches created description",
    retrievedCommunity.description,
    createdCommunity.description,
  );
  TestValidator.equals(
    "retrieved community visibility matches created visibility",
    retrievedCommunity.visibility,
    createdCommunity.visibility,
  );
  TestValidator.equals(
    "retrieved community status matches created status",
    retrievedCommunity.status,
    createdCommunity.status,
  );
  TestValidator.equals(
    "retrieved community is_nsfw flag matches created flag",
    retrievedCommunity.is_nsfw,
    createdCommunity.is_nsfw,
  );
  TestValidator.equals(
    "retrieved community is_quarantined flag matches created flag",
    retrievedCommunity.is_quarantined,
    createdCommunity.is_quarantined,
  );
  TestValidator.equals(
    "retrieved community is_posting_restricted flag matches created flag",
    retrievedCommunity.is_posting_restricted,
    createdCommunity.is_posting_restricted,
  );
  TestValidator.equals(
    "retrieved community allow_text_posts flag matches created flag",
    retrievedCommunity.allow_text_posts,
    createdCommunity.allow_text_posts,
  );
  TestValidator.equals(
    "retrieved community allow_link_posts flag matches created flag",
    retrievedCommunity.allow_link_posts,
    createdCommunity.allow_link_posts,
  );
  TestValidator.equals(
    "retrieved community allow_image_posts flag matches created flag",
    retrievedCommunity.allow_image_posts,
    createdCommunity.allow_image_posts,
  );
  TestValidator.equals(
    "retrieved community owner_memberuser_id matches created owner_memberuser_id",
    retrievedCommunity.owner_memberuser_id,
    createdCommunity.owner_memberuser_id,
  );

  // System-managed timestamps should also be present and logically consistent.
  TestValidator.equals(
    "retrieved community created_at matches created created_at",
    retrievedCommunity.created_at,
    createdCommunity.created_at,
  );
  TestValidator.equals(
    "retrieved community updated_at matches created updated_at",
    retrievedCommunity.updated_at,
    createdCommunity.updated_at,
  );
}
