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
 * Validate that updating a member user's account restriction with an invalid
 * temporal window (ends_at earlier than starts_at) is rejected.
 *
 * Business goal: Ensure that the administrative update endpoint for member-user
 * account restrictions enforces logical time-window constraints and fails when
 * an admin attempts to set ends_at < starts_at, leaving the restriction
 * effectively unchanged.
 *
 * Scenario steps:
 *
 * 1. Register an adminUser via the join endpoint to obtain an authenticated
 *    administrative context. This sets the Authorization header on the
 *    connection for subsequent calls.
 * 2. Choose a synthetic member username string (we assume the member exists or
 *    that the backend in this test context accepts it).
 * 3. Create a valid account restriction episode for that member using the
 *    memberUsers.accountRestrictions.create endpoint with an
 *    ICommunityPlatformAccountRestriction.ICreate payload where starts_at is
 *    before ends_at.
 * 4. Attempt to update the restriction via memberUsers.accountRestrictions.update
 *    using an ICommunityPlatformAccountRestriction.IUpdate payload whose
 *    starts_at is later than ends_at (i.e., ends_at < starts_at).
 * 5. Assert that this update attempt results in an error (business validation
 *    failure) using TestValidator.error. We do not assert a specific HTTP
 *    status code or error-body shape, only that an error is thrown.
 *
 * Notes:
 *
 * - All request bodies strictly follow the provided DTO types; no type-error
 *   scenarios are constructed.
 * - Because we have no read/list endpoint for reloading the restriction, we
 *   cannot re-assert stored values after failure and instead rely on the
 *   invariant that a rejected update does not mutate state.
 */
export async function test_api_admin_member_account_restriction_update_invalid_time_range_rejected(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain authorized context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);

  // 2. Prepare a synthetic member username.
  const memberUsername: string = RandomGenerator.name(1).replace(/\s+/g, "_");

  // 3. Create a valid restriction episode for this member.
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour

  const createBody = {
    account_type: "member",
    scope: "login",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const created: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username: memberUsername,
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(created);

  // 4. Attempt invalid temporal window update: ends_at earlier than starts_at.
  const futureStart = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const pastEnd = now.toISOString();

  const invalidUpdateBody = {
    starts_at: futureStart,
    ends_at: pastEnd,
  } satisfies ICommunityPlatformAccountRestriction.IUpdate;

  await TestValidator.error(
    "update must fail when ends_at is earlier than starts_at",
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.update(
        connection,
        {
          username: memberUsername,
          accountRestrictionId: created.id,
          body: invalidUpdateBody,
        },
      );
    },
  );
}
