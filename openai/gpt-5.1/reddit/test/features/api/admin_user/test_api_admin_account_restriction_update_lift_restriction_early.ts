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
 * Validate early lifting/shortening of an adminUser account restriction.
 *
 * Business intent:
 *
 * - Ensure an authenticated adminUser can update an existing restriction episode
 *   on an admin account so that its `ends_at` is brought forward (earlier),
 *   effectively shortening or lifting the restriction earlier than initially
 *   planned.
 * - Confirm that the core restriction fields are updated while linkage to the
 *   admin user remains intact and audit fields advance.
 *
 * Steps:
 *
 * 1. Register an acting adminUser via /auth/adminUser/join.
 * 2. Create an account restriction episode directly linked to that adminUser via
 *    /communityPlatform/adminUser/adminUsers/{username}/accountRestrictions
 *    with a future window.
 * 3. Prepare an update payload that sets `ends_at` to an earlier (but still valid)
 *    time and updates `reason_detail`.
 * 4. Call the update endpoint
 *    /communityPlatform/adminUser/adminUsers/{username}/accountRestrictions/{accountRestrictionId}.
 * 5. Assert on returned DTO that:
 *
 *    - The id matches the original restriction.
 *    - `ends_at` is changed to the earlier value and is earlier than the original.
 *    - The updated `reason_detail` is stored.
 *    - `updated_at` is greater than or equal to the original value.
 *    - The `adminUserRestriction` linkage still exists.
 */
export async function test_api_admin_account_restriction_update_lift_restriction_early(
  connection: api.IConnection,
) {
  // 1. Register an acting adminUser
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const username: string = authorized.username;

  // 2. Create an account restriction episode linked to this adminUser
  const now: Date = new Date();
  const startsAt: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 10 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // 10 minutes in future
  const endsAtOriginal: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // 1 hour in future

  const createRestrictionBody = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAtOriginal,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const linkedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username,
        body: createRestrictionBody,
      },
    );
  typia.assert(linkedRestriction);

  const originalId = linkedRestriction.id;
  const originalUpdatedAt = linkedRestriction.updated_at;
  const originalEndsAt = linkedRestriction.ends_at ?? endsAtOriginal;

  // 3. Prepare update payload with earlier ends_at and updated reason_detail
  const earlierEndsAt: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 30 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // 30 minutes in future

  const updatedReasonDetail = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    ends_at: earlierEndsAt,
    reason_detail: updatedReasonDetail,
  } satisfies ICommunityPlatformAccountRestriction.IUpdate;

  // 4. Call update endpoint
  const updatedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.update(
      connection,
      {
        username,
        accountRestrictionId: linkedRestriction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRestriction);

  // 5. Assertions on updated DTO
  TestValidator.equals(
    "restriction id should remain unchanged after update",
    updatedRestriction.id,
    originalId,
  );

  TestValidator.equals(
    "updated ends_at should equal the earlier target time",
    updatedRestriction.ends_at ?? null,
    earlierEndsAt,
  );

  TestValidator.predicate(
    "updated ends_at should be earlier than original ends_at",
    new Date(
      (updatedRestriction.ends_at ?? earlierEndsAt) as string,
    ).getTime() < new Date(originalEndsAt).getTime(),
  );

  TestValidator.equals(
    "updated reason_detail should be stored",
    updatedRestriction.reason_detail ?? null,
    updatedReasonDetail,
  );

  TestValidator.predicate(
    "updated_at should advance after update",
    new Date(updatedRestriction.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  TestValidator.predicate(
    "adminUserRestriction linkage should remain present",
    updatedRestriction.adminUserRestriction !== null &&
      updatedRestriction.adminUserRestriction !== undefined,
  );
}
