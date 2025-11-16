import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that multiple distinct member users can each create an independent
 * membership in the same community.
 *
 * Business flow:
 *
 * 1. Member A joins as a community platform memberUser (join endpoint).
 * 2. As Member A, create a new community and capture its slug.
 * 3. As Member A, create membership A for that community.
 * 4. Member B joins as another memberUser (join endpoint, overwriting auth).
 * 5. As Member B, create membership B for the same community.
 *
 * Validations:
 *
 * - Both membership creations succeed and return valid
 *   ICommunityPlatformCommunityMembership objects.
 * - Membership IDs are distinct.
 * - Each membership.memberUser.id matches the creating memberUser (A or B).
 * - Both memberships reference the same community slug.
 */
export async function test_api_community_membership_creation_for_multiple_members_in_same_community(
  connection: api.IConnection,
) {
  // 1. Member A joins
  const memberAJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Member A creates a community
  const communityCreateBody = {
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
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  const communitySlug: string = community.slug;

  // 3. Member A creates membership A for this community
  const membershipABody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipABody,
      },
    );
  typia.assert(membershipA);

  // Basic invariants for membership A
  TestValidator.equals(
    "membership A community slug matches created community",
    membershipA.community.slug,
    communitySlug,
  );
  TestValidator.equals(
    "membership A memberUser id matches Member A id",
    membershipA.memberUser.id,
    memberA.id,
  );

  // 4. Member B joins (this will update connection's Authorization header)
  const memberBJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 5. Member B creates membership B for the same community
  const membershipBBody = {
    role: "moderator",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipBBody,
      },
    );
  typia.assert(membershipB);

  // Validations between memberships A and B
  TestValidator.notEquals(
    "membership IDs for A and B must be distinct",
    membershipA.id,
    membershipB.id,
  );

  TestValidator.equals(
    "membership B community slug matches created community",
    membershipB.community.slug,
    communitySlug,
  );

  TestValidator.equals(
    "membership B memberUser id matches Member B id",
    membershipB.memberUser.id,
    memberB.id,
  );

  // Ensure no cross-contamination: A is not B and B is not A by memberUser id
  TestValidator.notEquals(
    "member A and member B ids must differ",
    memberA.id,
    memberB.id,
  );

  // Roles may differ as configured
  TestValidator.notEquals(
    "membership roles between A and B can differ",
    membershipA.role,
    membershipB.role,
  );
}
