import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate retrieval of community membership detail by admin.
 *
 * This test ensures that an administrator, after creating a community and
 * following a normal user registration and join sequence, can retrieve the
 * detailed information of a given community membership via the admin membership
 * detail API.
 *
 * Steps:
 *
 * 1. Admin registers using unique email, password, and display name.
 * 2. Admin creates a community with a unique name and valid description.
 * 3. Regular user registers with their own unique email, password, and display
 *    name.
 * 4. User joins the created community as a member.
 * 5. Admin retrieves the membership detail using the admin endpoint, referencing
 *    communityId and membershipId.
 * 6. Validate that the returned membership references the correct user and
 *    community, and the join timestamp is well-formed.
 */
export async function test_api_admin_community_membership_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinReq = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://admin-join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinReq,
  });
  typia.assert(admin);

  // 2. Admin creates a new community
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityDesc = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 8,
  });
  const communityReq = {
    name: communityName as string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">,
    description: communityDesc as string &
      tags.MinLength<1> &
      tags.MaxLength<250>,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      { body: communityReq },
    );
  typia.assert(community);

  // 3. User registers
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoinReq = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: "https://user-join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: userJoinReq,
  });
  typia.assert(user);

  // 4. User joins the community
  // Switch to user authentication
  await api.functional.auth.user.join(connection, { body: userJoinReq }); // Re-authenticate as user (token will change)
  const membership =
    await api.functional.communityPlatform.user.communities.memberships.create(
      connection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership);

  // 5. Re-authenticate as admin for access to admin membership retrieval
  await api.functional.auth.admin.join(connection, { body: adminJoinReq });

  // 6. Admin retrieves detailed membership info
  const adminMembership =
    await api.functional.communityPlatform.admin.communities.memberships.at(
      connection,
      {
        communityId: community.id,
        membershipId: membership.id,
      },
    );
  typia.assert(adminMembership);

  // 7. Validate properties: user and community references, join timestamp
  TestValidator.equals(
    "membership user is correct",
    adminMembership.user,
    membership.user,
  );
  TestValidator.equals(
    "membership community is correct",
    adminMembership.community,
    membership.community,
  );
  TestValidator.equals(
    "membership id matches",
    adminMembership.id,
    membership.id,
  );
  TestValidator.predicate(
    "joined_at is valid ISO 8601 date-time",
    typeof adminMembership.joined_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?$/.test(
        adminMembership.joined_at,
      ),
  );
}
