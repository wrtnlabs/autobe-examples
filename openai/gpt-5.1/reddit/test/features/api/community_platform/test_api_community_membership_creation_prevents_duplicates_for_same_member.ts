import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that duplicate community memberships for the same member user and
 * community are rejected.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a member user using /auth/memberUser/join.
 * 2. Create a new community as that member user.
 * 3. Create a first membership for the same member user in that community.
 * 4. Attempt to create a second membership for the same member/community pair and
 *    verify that it fails.
 *
 * This test focuses on business-logic validation only:
 *
 * - It asserts successful creation of the initial membership and correctness of
 *   key fields (community slug, member user id, role flags).
 * - It expects that a second, duplicate membership creation results in an error,
 *   but does not inspect HTTP status codes or error body contents.
 */
export async function test_api_community_membership_creation_prevents_duplicates_for_same_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user.
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    // Let the backend derive IP when omitted; here we explicitly send null,
    // which is allowed by the DTO type.
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body: joinBody });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorizedMember);

  // 2. Create a new community as this member user.
  const communityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(10)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 12,
    }) as string & tags.MinLength<1> & tags.MaxLength<255>,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 16,
    }) as string & tags.MaxLength<4000>,
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert<ICommunityPlatformCommunity>(createdCommunity);

  // Basic sanity check on the created community.
  TestValidator.equals(
    "created community slug should match requested slug",
    createdCommunity.slug,
    communityBody.slug,
  );

  // 3. Create the first membership for this member user and community.
  const firstMembershipBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const firstMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: createdCommunity.slug,
        body: firstMembershipBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(firstMembership);

  // Validate membership relationships and default flags.
  TestValidator.equals(
    "membership community slug matches created community",
    firstMembership.community.slug,
    createdCommunity.slug,
  );
  TestValidator.equals(
    "membership memberUser id matches authorized member",
    firstMembership.memberUser.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "membership role is 'member'",
    firstMembership.role,
    firstMembershipBody.role,
  );

  // 4. Attempt to create a duplicate membership for the same member/community.
  const duplicateMembershipBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  await TestValidator.error(
    "duplicate membership creation for same member/community should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.memberships.create(
        connection,
        {
          communitySlug: createdCommunity.slug,
          body: duplicateMembershipBody,
        },
      );
    },
  );
}
