import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_community_membership_detail_by_owner_member(
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

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create a new community as this member user
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(10),
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a membership for this member user in the new community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const createdMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(createdMembership);

  // Basic sanity checks on created membership
  TestValidator.equals(
    "created membership community slug matches community",
    createdMembership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "created membership community name matches community",
    createdMembership.community.name,
    community.name,
  );
  TestValidator.equals(
    "created membership member user id matches authorized user",
    createdMembership.memberUser.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "created membership member user username matches authorized user",
    createdMembership.memberUser.username,
    authorizedMember.username,
  );
  TestValidator.equals(
    "created membership role matches request",
    createdMembership.role,
    membershipCreateBody.role,
  );
  TestValidator.equals(
    "created membership isApproved matches request",
    createdMembership.isApproved,
    membershipCreateBody.isApproved,
  );
  TestValidator.equals(
    "created membership isBanned matches request",
    createdMembership.isBanned,
    membershipCreateBody.isBanned,
  );

  TestValidator.predicate(
    "created membership joinedAt is defined",
    createdMembership.joinedAt !== undefined &&
      createdMembership.joinedAt !== null &&
      createdMembership.joinedAt.length > 0,
  );
  TestValidator.predicate(
    "created membership createdAt is defined",
    createdMembership.createdAt !== undefined &&
      createdMembership.createdAt !== null &&
      createdMembership.createdAt.length > 0,
  );
  TestValidator.equals(
    "created membership leftAt should be undefined for active membership",
    createdMembership.leftAt,
    undefined,
  );

  // 4. Retrieve the membership details using the GET endpoint
  const fetchedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.at(
      connection,
      {
        communitySlug: community.slug,
        membershipId: createdMembership.id,
      },
    );
  typia.assert(fetchedMembership);

  // Validate fetched membership matches the created one and domain expectations
  TestValidator.equals(
    "fetched membership id matches created membership",
    fetchedMembership.id,
    createdMembership.id,
  );
  TestValidator.equals(
    "fetched membership community slug matches created community",
    fetchedMembership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "fetched membership community name matches created community",
    fetchedMembership.community.name,
    community.name,
  );
  TestValidator.equals(
    "fetched membership member user id matches authorized user",
    fetchedMembership.memberUser.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "fetched membership member user username matches authorized user",
    fetchedMembership.memberUser.username,
    authorizedMember.username,
  );
  TestValidator.equals(
    "fetched membership role matches creation request",
    fetchedMembership.role,
    membershipCreateBody.role,
  );
  TestValidator.equals(
    "fetched membership isApproved matches creation request",
    fetchedMembership.isApproved,
    membershipCreateBody.isApproved,
  );
  TestValidator.equals(
    "fetched membership isBanned matches creation request",
    fetchedMembership.isBanned,
    membershipCreateBody.isBanned,
  );

  TestValidator.predicate(
    "fetched membership joinedAt is defined",
    fetchedMembership.joinedAt !== undefined &&
      fetchedMembership.joinedAt !== null &&
      fetchedMembership.joinedAt.length > 0,
  );
  TestValidator.predicate(
    "fetched membership createdAt is defined",
    fetchedMembership.createdAt !== undefined &&
      fetchedMembership.createdAt !== null &&
      fetchedMembership.createdAt.length > 0,
  );
  TestValidator.equals(
    "fetched membership leftAt should be undefined for active membership",
    fetchedMembership.leftAt,
    undefined,
  );
}
