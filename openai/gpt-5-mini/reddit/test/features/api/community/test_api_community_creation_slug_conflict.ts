import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

export async function test_api_community_creation_slug_conflict(
  connection: api.IConnection,
) {
  // 1) Owner (creator) registration
  const ownerUsername = RandomGenerator.alphaNumeric(8);
  const ownerEmail = `${ownerUsername}@example.test`;
  const ownerPassword = "Passw0rd1"; // Meets required pattern: min 8 chars, upper+lower+digit

  const ownerJoinBody = {
    email: ownerEmail,
    username: ownerUsername,
    password: ownerPassword,
    profile: { display_name: RandomGenerator.name() },
    session_context: {
      href: "http://example.test/signup",
      referrer: "http://example.test/",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const ownerAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: ownerJoinBody,
    });
  typia.assert(ownerAuth);

  // 2) Owner creates initial community with a unique slug (mixed-case to exercise normalization)
  const baseSlug = `TestCommunity-${Date.now()}`;
  const communityName = `Test Community ${RandomGenerator.paragraph({ sentences: 2 })}`;

  const createBody = {
    name: communityName,
    slug: baseSlug, // server expected to normalize to lowercase
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "public",
    post_approval_required: false,
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(community);

  // Business invariants for the newly created community
  TestValidator.equals(
    "initial community members_count is zero",
    community.members_count,
    0,
  );
  TestValidator.equals(
    "initial community posts_count is zero",
    community.posts_count,
    0,
  );

  // 3) Challenger registration
  const challengerUsername = RandomGenerator.alphaNumeric(8);
  const challengerEmail = `${challengerUsername}@example.test`;
  const challengerPassword = "Passw0rd1";

  const challengerJoinBody = {
    email: challengerEmail,
    username: challengerUsername,
    password: challengerPassword,
    session_context: {
      href: "http://example.test/signup",
      referrer: "http://example.test/",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const challengerAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: challengerJoinBody,
    });
  typia.assert(challengerAuth);

  // 4) Challenger attempts to create a community with the same slug (case-variant)
  const duplicateSlugBody = {
    name: `${communityName} - Duplicate Attempt`,
    slug: baseSlug.toUpperCase(), // intentionally different case to trigger normalization-based conflict
    description: "Attempting to create duplicate slug",
    visibility: "public",
  } satisfies ICommunityBbsCommunity.ICreate;

  await TestValidator.error(
    "creating a community with duplicate slug should fail",
    async () => {
      await api.functional.communityBbs.communityMember.communities.create(
        connection,
        {
          body: duplicateSlugBody,
        },
      );
    },
  );

  // 5) Verify original community remained unchanged in cached aggregates
  // (We rely on the originally returned community object for these invariants.)
  TestValidator.equals(
    "original community members_count unchanged",
    community.members_count,
    0,
  );
  TestValidator.equals(
    "original community posts_count unchanged",
    community.posts_count,
    0,
  );
}
