import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

/**
 * Test admin retrieval of all community memberships with
 * pagination/filter/sort.
 *
 * 1. Register and authenticate an admin
 * 2. Admin creates a new community
 * 3. Register and authenticate a new user
 * 4. User joins the created community
 * 5. Admin retrieves memberships list with pagination, search, and date filtering
 * 6. Validate returned data includes the joined user and respects query params
 */
export async function test_api_admin_community_membership_list_successful(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminDisplayName = RandomGenerator.name();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: adminDisplayName,
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin email matches input",
    adminAuth.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin display name matches",
    adminAuth.display_name,
    adminDisplayName,
  );

  // 2. Admin creates a community
  const communityName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 5,
  })
    .replace(/\s+/g, "_")
    .toLowerCase();
  const communityDesc = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 4,
    wordMax: 10,
  });
  const community =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      {
        body: {
          name: communityName as string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">,
          description: communityDesc as string &
            tags.MinLength<1> &
            tags.MaxLength<250>,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches input",
    community.description,
    communityDesc,
  );

  // 3. Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userDisplayName = RandomGenerator.name();
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(10),
      display_name: userDisplayName,
      href: "https://user.example.com/register",
      referrer: "https://user.example.com/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  TestValidator.equals("user email matches input", userAuth.email, userEmail);
  TestValidator.equals(
    "user display_name matches input",
    userAuth.display_name,
    userDisplayName,
  );

  // 4. User joins the created community
  // Switch auth context: userAuth.token sets Authorization automatically
  await api.functional.communityPlatform.user.communities.memberships.create(
    connection,
    {
      communityId: community.id,
      body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
    },
  );

  // 5. Admin retrieves memberships list with pagination, filter, and sort
  // Switch back to admin - re-auth not needed, but must ensure context is correct
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password:
        adminAuth.token !== undefined
          ? (undefined as unknown as string)
          : RandomGenerator.alphaNumeric(12),
      display_name: adminDisplayName,
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  const filterJoinedAfter = new Date(
    Date.now() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const membershipPage =
    await api.functional.communityPlatform.admin.communities.memberships.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          search: userDisplayName.split(" ")[0],
          sort_by: "join_date",
          sort_order: "asc",
          joined_after: filterJoinedAfter,
        } satisfies ICommunityPlatformCommunityMembership.IRequest,
      },
    );
  typia.assert(membershipPage);
  const userFound = membershipPage.data.some(
    (m) => m.user.display_name === userDisplayName,
  );
  TestValidator.predicate(
    "user is present in membership list (search + filter)",
    userFound,
  );
  const joinedMembership = membershipPage.data.find(
    (m) => m.user.display_name === userDisplayName,
  );
  if (joinedMembership) {
    TestValidator.equals(
      "community ID matches",
      joinedMembership.community.id,
      community.id,
    );
    TestValidator.equals(
      "user display_name matches",
      joinedMembership.user.display_name,
      userDisplayName,
    );
    TestValidator.predicate(
      "joined_at is after filterJoinedAfter",
      joinedMembership.joined_at > filterJoinedAfter,
    );
  } else {
    throw new Error("Expected user membership not found in admin listing");
  }
  TestValidator.equals(
    "community membership list pagination page",
    membershipPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "membership list size is at least 1",
    membershipPage.data.length >= 1,
  );
}
