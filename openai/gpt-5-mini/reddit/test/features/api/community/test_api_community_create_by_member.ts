import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

export async function test_api_community_create_by_member(
  connection: api.IConnection,
) {
  // 1) Register a new member account
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-TEST",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  // Validate response shape and capture the member id
  typia.assert(member);

  // 2) Prepare community creation payload
  const name = RandomGenerator.name(2);
  // Create a safe slug: lowercase alphanumeric
  const slug = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityBody = {
    name,
    slug,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  // 3) Create community as authenticated member
  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });

  // 4) Assertions: type validation and business expectations
  typia.assert(community);

  // Creator must match the authenticated member id
  TestValidator.equals(
    "community.creator_user_id should match authenticated member id",
    community.creator_user_id,
    member.id,
  );

  // Slug should reflect the provided slug (server canonicalization expected but we supplied normalized slug)
  TestValidator.equals(
    "community.slug should match requested slug",
    community.slug,
    slug,
  );

  // Privacy and visibility flags must reflect the request
  TestValidator.equals(
    "community.is_private reflects request",
    community.is_private,
    communityBody.is_private,
  );
  TestValidator.equals(
    "community.visibility reflects request",
    community.visibility,
    communityBody.visibility,
  );

  // Timestamps are present (typia.assert already validated format). We perform a predicate to ensure non-empty strings.
  TestValidator.predicate(
    "community.created_at is present",
    community.created_at !== null &&
      community.created_at !== undefined &&
      community.created_at.length > 0,
  );
  TestValidator.predicate(
    "community.updated_at is present",
    community.updated_at !== null &&
      community.updated_at !== undefined &&
      community.updated_at.length > 0,
  );

  // 5) Duplicate slug attempt must fail (business conflict). Use await because callback is async.
  await TestValidator.error(
    "creating community with duplicate slug should fail",
    async () => {
      const duplicateBody = {
        name: `${name} (duplicate)`,
        slug,
        description: null,
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate;

      await api.functional.communityPortal.member.communities.create(
        connection,
        {
          body: duplicateBody,
        },
      );
    },
  );
}
