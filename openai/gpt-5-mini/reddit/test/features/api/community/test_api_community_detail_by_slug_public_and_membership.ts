import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

export async function test_api_community_detail_by_slug_public_and_membership(
  connection: api.IConnection,
) {
  /**
   * 1. Create a fresh community member (creator) via the join endpoint. The join()
   *    call will set connection.headers.Authorization automatically with the
   *    returned token, enabling subsequent authenticated requests.
   */
  const timestamp = Date.now();
  const creatorEmail = `test-creator-${timestamp}@example.test`;
  const creatorUsername = RandomGenerator.alphaNumeric(8);

  const joined = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: creatorEmail,
      username: creatorUsername,
      password: "Passw0rd!",
      session_context: {
        href: "http://localhost/",
        referrer: "http://localhost/ref",
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(joined);

  // Creator summary for later comparisons
  const creatorSummary = joined.member;

  /** 2. Create a public community as the authenticated creator. */
  const publicSlug = `test-community-${timestamp}-detail`;
  const createPublicBody = {
    name: RandomGenerator.name(2),
    slug: publicSlug,
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    visibility: "public",
    post_approval_required: false,
  } satisfies ICommunityBbsCommunity.ICreate;

  const publicCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: createPublicBody,
      },
    );
  typia.assert(publicCommunity);

  // Basic business-level assertions
  TestValidator.equals(
    "created public community slug matches",
    publicCommunity.slug,
    publicSlug,
  );
  TestValidator.equals(
    "created public community creator matches authenticated member",
    publicCommunity.creator.id,
    creatorSummary.id,
  );
  TestValidator.predicate(
    "public community members_count is at least 1",
    publicCommunity.members_count >= 1,
  );
  TestValidator.predicate(
    "public community posts_count is a non-negative number",
    publicCommunity.posts_count >= 0,
  );

  // Ensure deleted_at is not exposed to public callers (should be null/undefined)
  TestValidator.predicate(
    "public response does not expose deleted_at to callers",
    publicCommunity.deleted_at === null ||
      publicCommunity.deleted_at === undefined,
  );

  /**
   * 3. As an unauthenticated client, GET the public community by slug and validate
   *    returned fields.
   */
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const publicAsGuest = await api.functional.communityBbs.communities.at(
    unauthConn,
    {
      communitySlug: publicSlug,
    },
  );
  typia.assert(publicAsGuest);

  TestValidator.equals("guest sees same slug", publicAsGuest.slug, publicSlug);
  TestValidator.equals(
    "guest sees creator id",
    publicAsGuest.creator.id,
    creatorSummary.id,
  );
  TestValidator.predicate(
    "guest sees members_count >= 1",
    publicAsGuest.members_count >= 1,
  );
  TestValidator.predicate(
    "guest sees posts_count >= 0",
    publicAsGuest.posts_count >= 0,
  );
  TestValidator.predicate(
    "guest response does not expose deleted_at",
    publicAsGuest.deleted_at === null || publicAsGuest.deleted_at === undefined,
  );

  /**
   * 4. Create a private community and test visibility semantics.
   *
   *    - Unauthenticated GET should fail (403/404). We assert that an error is
   *         thrown for unauthenticated access.
   *    - Authenticated (creator) GET should succeed and include creator info.
   */
  const privateSlug = `test-community-${timestamp}-private`;
  const createPrivateBody = {
    name: RandomGenerator.name(2),
    slug: privateSlug,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "private",
    post_approval_required: false,
  } satisfies ICommunityBbsCommunity.ICreate;

  const privateCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      { body: createPrivateBody },
    );
  typia.assert(privateCommunity);

  // Unauthenticated client must NOT access private community
  await TestValidator.error(
    "unauthenticated client cannot access private community",
    async () => {
      await api.functional.communityBbs.communities.at(unauthConn, {
        communitySlug: privateSlug,
      });
    },
  );

  // Authenticated creator can access private community
  const privateAsCreator = await api.functional.communityBbs.communities.at(
    connection,
    {
      communitySlug: privateSlug,
    },
  );
  typia.assert(privateAsCreator);

  TestValidator.equals(
    "creator can see private community slug",
    privateAsCreator.slug,
    privateSlug,
  );
  TestValidator.equals(
    "creator is recorded as community creator",
    privateAsCreator.creator.id,
    creatorSummary.id,
  );
  TestValidator.predicate(
    "private community members_count is at least 1",
    privateAsCreator.members_count >= 1,
  );

  /**
   * 5. Final business validations: slug resolution exactness and membership
   *    reflect creator membership.
   */
  TestValidator.equals(
    "public slug exact resolution",
    publicAsGuest.slug,
    publicSlug,
  );
  TestValidator.equals(
    "private slug exact resolution for creator",
    privateAsCreator.slug,
    privateSlug,
  );
  TestValidator.equals(
    "creator id present in community creator summary",
    publicAsGuest.creator.id,
    creatorSummary.id,
  );
}
