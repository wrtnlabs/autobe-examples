import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that an authenticated adminUser can create account restriction
 * episodes and retrieve member user detail records, ensuring structural
 * consistency of security-related fields on the member detail payload.
 *
 * Due to the limited API surface available in this test slice, we cannot:
 *
 * - Create or update member users.
 * - Attach restriction episodes to concrete members.
 * - Directly toggle is_suspended / is_banned or failed_login_count.
 *
 * Therefore this test focuses on what is implementable:
 *
 * 1. Join an adminUser to obtain an authenticated admin context.
 * 2. Create two generic account restriction episodes as that admin using
 *    ICommunityPlatformAccountRestriction.ICreate (one bounded window and one
 *    indefinite window) and validate their structures via typia.assert.
 * 3. Call GET /communityPlatform/adminUser/memberUsers/{username} with a randomly
 *    generated username, validating that the response conforms to
 *    ICommunityPlatformMemberuser using typia.assert.
 *
 * These steps exercise the member detail endpoint from an admin perspective
 * while ensuring that all security-related flags and lifecycle timestamps are
 * structurally present and type-correct. Any deeper business invariants (such
 * as particular timestamp orderings or mutual exclusivity of suspension vs ban)
 * are deliberately not asserted here, because they are not guaranteed by the
 * DTO types and would make the test brittle under simulation.
 */
export async function test_api_admin_memberuser_detail_security_flags_consistency(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authenticated admin context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin!1234" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create two generic account restriction episodes as this admin.
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  const boundedRestrictionBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "security",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: now.toISOString(),
    ends_at: inOneHour.toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const boundedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: boundedRestrictionBody,
      },
    );
  typia.assert(boundedRestriction);

  const indefiniteRestrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    starts_at: now.toISOString(),
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const indefiniteRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: indefiniteRestrictionBody,
      },
    );
  typia.assert(indefiniteRestriction);

  // 3. Fetch a member user detail record for a random username and validate
  //    its structure. In simulation mode this will always succeed; in a
  //    concrete backend this assumes the username refers to an existing
  //    member user.
  const targetUsername: string = RandomGenerator.name(1);
  const member: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.adminUser.memberUsers.at(
      connection,
      {
        username: targetUsername,
      },
    );
  typia.assert(member);
}
