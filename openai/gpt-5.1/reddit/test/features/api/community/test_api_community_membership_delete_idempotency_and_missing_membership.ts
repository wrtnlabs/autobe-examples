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
 * Validate idempotent and missing-resource behavior of community membership
 * delete.
 *
 * Business scenario:
 *
 * - A regular memberUser creates a community and joins it, establishing a
 *   membership.
 * - An adminUser deletes that membership via the admin DELETE endpoint.
 * - The admin then attempts to delete the same membership again, and also tries
 *   deleting a completely random membershipId, to confirm consistent
 *   "not-found" style error behavior for already-deleted and never-existing
 *   memberships.
 *
 * Steps:
 *
 * 1. Register a memberUser via /auth/memberUser/join and obtain an authenticated
 *    context.
 * 2. Register an adminUser via /auth/adminUser/join and capture its login
 *    identifier.
 * 3. As memberUser, create a community via POST
 *    /communityPlatform/memberUser/communities.
 * 4. As memberUser, create a membership for that community via POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.
 * 5. Switch to adminUser by logging in via /auth/adminUser/login.
 * 6. Call DELETE
 *    /communityPlatform/adminUser/communities/{communitySlug}/memberships/{membershipId}
 *    once and assert it completes without error.
 * 7. Call the same DELETE again on the same (communitySlug, membershipId) and
 *    assert that it throws an error, indicating the membership no longer
 *    exists.
 * 8. Call DELETE with the same communitySlug but a random UUID membershipId and
 *    assert that it also throws an error, confirming consistent behavior for
 *    memberships that never existed.
 */
export async function test_api_community_membership_delete_idempotency_and_missing_membership(
  connection: api.IConnection,
) {
  // 1. Register memberUser and obtain authenticated context
  const memberHref = "https://client.example.com/member/join";
  const memberReferrer = "https://client.example.com/landing";

  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register adminUser and capture credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordValue = typia.random<string & tags.Format<"password">>();

  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: adminEmail,
    password: adminPasswordValue,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As memberUser, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
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

  // 4. As memberUser, create a membership in that community
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

  // 5. Switch to adminUser by logging in (overwrites Authorization header)
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPasswordValue,
    ip: null,
    href: "https://client.example.com/admin/login",
    referrer: "https://client.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 6. First DELETE should succeed without throwing
  await api.functional.communityPlatform.adminUser.communities.memberships.erase(
    connection,
    {
      communitySlug: community.slug,
      membershipId: membership.id,
    },
  );

  // 7. Second DELETE on same membership: expect not-found style error
  await TestValidator.error(
    "second delete on same membership should error as not-found",
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

  // 8. DELETE with a random, non-existing membershipId: expect consistent error
  const randomMembershipId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "delete random non-existing membership id should error as not-found",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.memberships.erase(
        connection,
        {
          communitySlug: community.slug,
          membershipId: randomMembershipId,
        },
      );
    },
  );
}
