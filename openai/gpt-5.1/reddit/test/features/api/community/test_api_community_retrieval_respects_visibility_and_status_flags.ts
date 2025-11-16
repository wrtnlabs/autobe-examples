import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate public community retrieval honors visibility and status flags.
 *
 * Business goal: Ensure the public GET
 * /communityPlatform/communities/{communitySlug} endpoint only returns
 * communities that should be visible according to their visibility and
 * lifecycle status flags, and that communities configured as non-public or
 * non-active are not successfully exposed.
 *
 * Scenario:
 *
 * 1. Join as a memberUser using POST /auth/memberUser/join. This both creates a
 *    member user row and sets the Authorization header on the shared
 *    connection, enabling authenticated memberUser calls.
 * 2. Create multiple communities via POST
 *    /communityPlatform/memberUser/communities with distinct
 *    ICommunityPlatformCommunity.ICreate configurations, for example:
 *
 *    - PublicActive: visibility="public", status="active".
 *    - RestrictedActive: visibility="restricted", status="active".
 *    - PrivateActive: visibility="private", status="active". ("private" and
 *         "restricted" are treated as opaque strings here – the service
 *         enforces the meaning.)
 *    - PublicArchived: visibility="public", status="archived". The exact string
 *         values are not enums in the type system, so we choose representative
 *         literals consistent with the documentation.
 * 3. For each created community, call the unauthenticated GET
 *    /communityPlatform/communities/{communitySlug} endpoint by cloning the
 *    connection and clearing headers so that no Authorization is sent.
 *
 *    - For the publicActive community slug, expect a successful
 *         ICommunityPlatformCommunity response and validate it with
 *         typia.assert. Also check key business attributes (slug, name,
 *         visibility, status).
 *    - For the other communities, use TestValidator.error with an async closure to
 *         assert that attempting to fetch them as an unauthenticated caller
 *         does _not_ succeed with a typed community response. We do not assert
 *         specific HTTP status codes, only that an error is thrown.
 * 4. This ensures that the public endpoint does not leak non-public or non-active
 *    communities while correctly exposing public, active ones.
 */
export async function test_api_community_retrieval_respects_visibility_and_status_flags(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a memberUser so we can create communities.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create communities with different visibility and status configurations.
  const publicActiveSlug = `public-active-${RandomGenerator.alphaNumeric(8)}`;
  const restrictedActiveSlug = `restricted-active-${RandomGenerator.alphaNumeric(8)}`;
  const privateActiveSlug = `private-active-${RandomGenerator.alphaNumeric(8)}`;
  const publicArchivedSlug = `public-archived-${RandomGenerator.alphaNumeric(8)}`;

  const publicActiveCreate = {
    slug: publicActiveSlug,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const restrictedActiveCreate = {
    slug: restrictedActiveSlug,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    visibility: "restricted",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const privateActiveCreate = {
    slug: privateActiveSlug,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    visibility: "private",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: true,
    allow_text_posts: true,
    allow_link_posts: false,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const publicArchivedCreate = {
    slug: publicArchivedSlug,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    visibility: "public",
    status: "archived",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: true,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const publicActive =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: publicActiveCreate },
    );
  typia.assert(publicActive);

  const restrictedActive =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: restrictedActiveCreate },
    );
  typia.assert(restrictedActive);

  const privateActive =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: privateActiveCreate },
    );
  typia.assert(privateActive);

  const publicArchived =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: publicArchivedCreate },
    );
  typia.assert(publicArchived);

  // 3. Prepare an unauthenticated connection by cloning without headers.
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  // 3a. Public + active community should be retrievable by unauthenticated client.
  const fetchedPublicActive: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(publicConnection, {
      communitySlug: publicActive.slug,
    });
  typia.assert(fetchedPublicActive);
  TestValidator.equals(
    "public active community slug should match",
    fetchedPublicActive.slug,
    publicActive.slug,
  );
  TestValidator.equals(
    "public active community visibility should be public",
    fetchedPublicActive.visibility,
    publicActive.visibility,
  );
  TestValidator.equals(
    "public active community status should be active",
    fetchedPublicActive.status,
    publicActive.status,
  );

  // 3b. Restricted, private, or archived communities should not be exposed via public GET.
  await TestValidator.error(
    "restricted active community should not be publicly retrievable",
    async () => {
      await api.functional.communityPlatform.communities.at(publicConnection, {
        communitySlug: restrictedActive.slug,
      });
    },
  );

  await TestValidator.error(
    "private active community should not be publicly retrievable",
    async () => {
      await api.functional.communityPlatform.communities.at(publicConnection, {
        communitySlug: privateActive.slug,
      });
    },
  );

  await TestValidator.error(
    "public archived community should not be publicly retrievable",
    async () => {
      await api.functional.communityPlatform.communities.at(publicConnection, {
        communitySlug: publicArchived.slug,
      });
    },
  );
}
