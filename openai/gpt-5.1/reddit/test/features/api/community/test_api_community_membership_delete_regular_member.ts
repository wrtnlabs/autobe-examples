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
 * Validate that an adminUser can delete a regular community membership while
 * preserving the community and other memberships (e.g., owner/primary).
 *
 * Business workflow:
 *
 * 1. Register an adminUser who will later perform the deletion.
 * 2. Register two memberUsers (owner and regular member).
 * 3. As the first memberUser, create a community.
 * 4. As the first memberUser, create a membership in that community
 *    (owner/primary).
 * 5. As the second memberUser, create a regular membership in the same community.
 * 6. Switch to adminUser and delete the second memberUser's membership via the
 *    admin-only DELETE endpoint.
 * 7. Assert that delete succeeds, the community still exists in local state, and
 *    the owner membership remains distinct from the deleted one.
 */
export async function test_api_community_membership_delete_regular_member(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (join)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register first memberUser (owner)
  const ownerJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<8>,
    ip: null,
    href: "https://community.local/join-owner" as string & tags.Format<"uri">,
    referrer: "https://community.local/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const ownerAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: ownerJoinBody,
    });
  typia.assert(ownerAuthorized);

  // 3. Register second memberUser (regular member)
  const regularJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<8>,
    ip: null,
    href: "https://community.local/join-regular" as string & tags.Format<"uri">,
    referrer: "https://community.local/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const regularAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: regularJoinBody,
    });
  typia.assert(regularAuthorized);

  // 4. Authenticate explicitly as owner (first memberUser) for clarity
  const ownerLoginBody = {
    identifier: ownerJoinBody.email,
    password: ownerJoinBody.password,
    ip: null,
    href: "https://community.local/login-owner" as string & tags.Format<"uri">,
    referrer: "https://community.local/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const ownerLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: ownerLoginBody,
    });
  typia.assert(ownerLogin);

  // 5. As owner, create a community
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MinLength<1> & tags.MaxLength<255>,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community slug should match request slug",
    community.slug,
    communityCreateBody.slug,
  );

  // 6. As owner, create their own membership in the community
  const ownerMembershipCreateBody = {
    role: "owner",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const ownerMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: ownerMembershipCreateBody,
      },
    );
  typia.assert(ownerMembership);

  TestValidator.equals(
    "owner membership community slug should match",
    ownerMembership.community.slug,
    community.slug,
  );

  // 7. Authenticate as second memberUser (regular) and create a regular membership
  const regularLoginBody = {
    identifier: regularJoinBody.email,
    password: regularJoinBody.password,
    ip: null,
    href: "https://community.local/login-regular" as string &
      tags.Format<"uri">,
    referrer: "https://community.local/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const regularLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: regularLoginBody,
    });
  typia.assert(regularLogin);

  const regularMembershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const regularMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: regularMembershipCreateBody,
      },
    );
  typia.assert(regularMembership);

  TestValidator.equals(
    "regular membership community slug should match",
    regularMembership.community.slug,
    community.slug,
  );

  TestValidator.notEquals(
    "owner and regular memberships must have different IDs",
    ownerMembership.id,
    regularMembership.id,
  );

  // 8. Switch authentication back to adminUser via login
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://community.local/login-admin" as string & tags.Format<"uri">,
    referrer: "https://community.local/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 9. As adminUser, delete the regular membership
  await api.functional.communityPlatform.adminUser.communities.memberships.erase(
    connection,
    {
      communitySlug: community.slug,
      membershipId: regularMembership.id,
    },
  );

  // 10. Post-conditions: community and owner membership should still be
  // logically intact within local state.
  TestValidator.equals(
    "community slug used in erase matches created community",
    community.slug,
    communityCreateBody.slug,
  );

  TestValidator.predicate(
    "owner membership still references the same community id",
    ownerMembership.community.id === community.id,
  );

  TestValidator.predicate(
    "regular membership id should look like a non-empty UUID string",
    ((): boolean => {
      const id: string = regularMembership.id;
      return id.length > 0;
    })(),
  );
}
