import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that an adminUser can delete an existing community membership.
 *
 * Business context:
 *
 * - A regular memberUser creates a community and a membership record for that
 *   community.
 * - An adminUser, operating via the admin API surface, should be able to remove
 *   that membership using the community slug and membership UUID.
 *
 * Steps:
 *
 * 1. Register a memberUser (join) and keep its credentials
 *    (email/username/password).
 * 2. Using the memberUser session, create a community via memberUser
 *    communities.create.
 * 3. Using the same memberUser session, create a membership in that community via
 *    memberUser communities.memberships.create and capture the membership id.
 * 4. Register an adminUser via adminUser.join and ensure the connection is now
 *    authenticated as an adminUser.
 * 5. Call adminUser communities.memberships.erase with the community slug and
 *    membership id created in step 3, and verify it completes without error.
 * 6. Optionally attempt a second erase on the same membership id and validate that
 *    an HTTP error is raised, confirming the deletion is persisted.
 */
export async function test_api_community_membership_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a memberUser via /auth/memberUser/join
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the memberUser
  const communityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
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

  // 3. Create a membership in the new community as the memberUser
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // Basic sanity checks on the membership response
  TestValidator.equals(
    "membership community slug matches created community",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership member id matches joined member",
    membership.memberUser.id,
    memberAuthorized.id,
  );

  // 4. Register an adminUser via /auth/adminUser/join (this also authenticates as admin)
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. Admin deletes the membership via adminUser erase endpoint
  await api.functional.communityPlatform.adminUser.communities.memberships.erase(
    connection,
    {
      communitySlug: community.slug,
      membershipId: membership.id,
    },
  );

  // If erase completes without throwing, we consider deletion successful.
  // 6. Optional: a second delete attempt should now fail with an HTTP error.
  await TestValidator.httpError(
    "second deletion attempt on same membership should fail",
    [400, 404, 410, 422],
    async () => {
      await api.functional.communityPlatform.adminUser.communities.memberships.erase(
        connection,
        {
          communitySlug: community.slug,
          membershipId: membership.id,
        },
      );
    },
  );
}
