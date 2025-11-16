import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Verify that membership detail lookup is correctly scoped by communitySlug and
 * keeps memberships for different member users in the same community isolated.
 *
 * Business workflow:
 *
 * 1. Member A joins as a community platform member user.
 * 2. Member A creates a community C.
 * 3. Member A creates membership A in community C.
 * 4. Member A fetches membership A detail and validates that it belongs to Member
 *    A and community C.
 * 5. Member B joins as a community platform member user (switches auth).
 * 6. Member B creates membership B in the same community C.
 * 7. Member B fetches membership B detail and validates that it belongs to Member
 *    B and community C.
 * 8. Cross-check both memberships share the same community summary while their
 *    membership IDs remain distinct.
 */
export async function test_api_community_membership_detail_for_multiple_members_same_community(
  connection: api.IConnection,
) {
  // 1. Member A joins the platform
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Member A creates community C
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  const communitySlug: string = community.slug;

  // 3. Member A creates membership A in community C
  const membershipACreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipACreateBody,
      },
    );
  typia.assert(membershipA);

  const membershipIdA: string = membershipA.id;

  // 4. As Member A, fetch membership A detail immediately
  const fetchedMembershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.at(
      connection,
      {
        communitySlug,
        membershipId: membershipIdA,
      },
    );
  typia.assert(fetchedMembershipA);

  // Validate membership A details
  TestValidator.equals(
    "fetched membership A id should match membershipIdA",
    fetchedMembershipA.id,
    membershipIdA,
  );

  TestValidator.equals(
    "membership A memberUser id should match Member A id",
    fetchedMembershipA.memberUser.id,
    memberA.id,
  );

  TestValidator.equals(
    "membership A memberUser username should match Member A username",
    fetchedMembershipA.memberUser.username,
    memberA.username,
  );

  TestValidator.equals(
    "membership A community slug should match created community slug",
    fetchedMembershipA.community.slug,
    community.slug,
  );

  TestValidator.equals(
    "membership A role should match creation payload",
    fetchedMembershipA.role,
    membershipACreateBody.role,
  );

  TestValidator.equals(
    "membership A isApproved should match creation payload",
    fetchedMembershipA.isApproved,
    membershipACreateBody.isApproved,
  );

  TestValidator.equals(
    "membership A isBanned should match creation payload",
    fetchedMembershipA.isBanned,
    membershipACreateBody.isBanned,
  );

  // 5. Member B joins the platform (this call switches auth context)
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 6. Member B creates membership B in the same community C
  const membershipBCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipBCreateBody,
      },
    );
  typia.assert(membershipB);

  const membershipIdB: string = membershipB.id;

  // Sanity: membership IDs must differ
  TestValidator.notEquals(
    "membership A and B ids must be distinct",
    membershipIdA,
    membershipIdB,
  );

  // 7. As Member B, fetch membership B detail
  const fetchedMembershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.at(
      connection,
      {
        communitySlug,
        membershipId: membershipIdB,
      },
    );
  typia.assert(fetchedMembershipB);

  // Validate membership B details
  TestValidator.equals(
    "fetched membership B id should match membershipIdB",
    fetchedMembershipB.id,
    membershipIdB,
  );

  TestValidator.equals(
    "membership B memberUser id should match Member B id",
    fetchedMembershipB.memberUser.id,
    memberB.id,
  );

  TestValidator.equals(
    "membership B memberUser username should match Member B username",
    fetchedMembershipB.memberUser.username,
    memberB.username,
  );

  TestValidator.equals(
    "membership B community slug should match created community slug",
    fetchedMembershipB.community.slug,
    community.slug,
  );

  TestValidator.equals(
    "membership B role should match creation payload",
    fetchedMembershipB.role,
    membershipBCreateBody.role,
  );

  TestValidator.equals(
    "membership B isApproved should match creation payload",
    fetchedMembershipB.isApproved,
    membershipBCreateBody.isApproved,
  );

  TestValidator.equals(
    "membership B isBanned should match creation payload",
    fetchedMembershipB.isBanned,
    membershipBCreateBody.isBanned,
  );

  // 8. Cross-validate both fetched memberships share the same community summary
  TestValidator.equals(
    "membership A and B community ids should match",
    fetchedMembershipA.community.id,
    fetchedMembershipB.community.id,
  );

  TestValidator.equals(
    "membership A and B community slugs should match",
    fetchedMembershipA.community.slug,
    fetchedMembershipB.community.slug,
  );
}
