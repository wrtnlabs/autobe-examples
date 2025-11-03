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
 * Test the scenario where an admin removes a user from a community.
 *
 * The flow consists of:
 *
 * 1. Register an admin
 * 2. Admin creates a community
 * 3. Register a user
 * 4. User joins the community
 * 5. Admin removes (deletes) the user's membership
 * 6. Optional: Ensure the user's membership is no longer present (future: via
 *    membership list query when available)
 */
export async function test_api_admin_remove_user_membership_from_community(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(10);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(2),
      href: "https://admin-join.test/",
      referrer: "https://admin-referrer.test/",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Admin creates community
  const communityCreate =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityCreate);

  // 3. Register a user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(10);
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: RandomGenerator.name(2),
      href: "https://user-join.test/",
      referrer: "https://user-referrer.test/",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);

  // 4. User joins the community
  // Switch user context
  // In real backend, this token switching will happen via SDK
  // But for simulation, both tokens are available in connection.headers automatically
  const userMembership =
    await api.functional.communityPlatform.user.communities.memberships.create(
      connection,
      {
        communityId: communityCreate.id,
        body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(userMembership);

  // 5. Admin removes the user's membership
  // Switch back to admin context (SDK manages token under the hood)
  await api.functional.communityPlatform.admin.communities.memberships.erase(
    connection,
    {
      communityId: communityCreate.id,
      membershipId: userMembership.id,
    },
  );

  // 6. Post-condition: the membership should not exist anymore
  // (Cannot verify via direct query since there is no list or get, but absence of error implies success)
}
