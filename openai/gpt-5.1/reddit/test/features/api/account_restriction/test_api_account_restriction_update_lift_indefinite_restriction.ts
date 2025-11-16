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
 * Validate transitioning an account restriction from indefinite to finite.
 *
 * Business objective
 *
 * - Ensure an authenticated adminUser can update an account restriction whose
 *   `ends_at` is null (open-ended) so that it becomes a finite restriction with
 *   a concrete future end timestamp.
 * - Verify that only `ends_at` changes when we send a partial update payload
 *   containing just that field, leaving other business attributes stable.
 * - Confirm temporal consistency (starts_at <= ends_at) and that system
 *   timestamps behave as expected (updated_at is newer than created_at while
 *   deleted_at remains null).
 *
 * Steps
 *
 * 1. Join as an adminUser using /auth/adminUser/join and obtain an authorized
 *    context (SDK will manage Authorization header).
 * 2. Create a new account restriction via POST
 *    /communityPlatform/adminUser/accountRestrictions with an
 *    ICommunityPlatformAccountRestriction.ICreate payload where:
 *
 *    - Account_type is a stable literal (e.g., "memberUser").
 *    - Scope is a stable literal (e.g., "login").
 *    - Reason_category is a stable literal (e.g., "policy_violation").
 *    - Reason_detail is some narrative text.
 *    - Starts_at is set to now (or earlier) via new Date().toISOString().
 *    - Ends_at is explicitly null to represent an indefinite restriction.
 * 3. Assert that the created restriction:
 *
 *    - Has ends_at === null.
 *    - Has deleted_at === null (or undefined treated as not deleted).
 * 4. Compute a future timestamp (e.g., now + 1 day) and call PUT
 *    /communityPlatform/adminUser/accountRestrictions/{accountRestrictionId}
 *    using
 *    api.functional.communityPlatform.adminUser.accountRestrictions.update
 *    with:
 *
 *    - AccountRestrictionId = createdRestriction.id.
 *    - Body: ICommunityPlatformAccountRestriction.IUpdate containing only ends_at
 *         set to the future timestamp.
 * 5. Validate that the updated restriction:
 *
 *    - Preserves id, account_type, scope, reason_category, reason_detail and
 *         starts_at from the original record.
 *    - Has ends_at equal to the new future timestamp and no longer null.
 *    - Has deleted_at still null (or undefined).
 *    - Has updated_at strictly greater than created_at.
 *    - Satisfies starts_at <= ends_at (by comparing Date values).
 */
export async function test_api_account_restriction_update_lift_indefinite_restriction(
  connection: api.IConnection,
) {
  // 1. Join as an adminUser to obtain an authorized context
  const joinRequest = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Create an indefinite account restriction
  const startsAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const createBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const created: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Basic invariants from creation
  TestValidator.equals(
    "created restriction ends_at should be null for indefinite restriction",
    created.ends_at ?? null,
    null,
  );

  TestValidator.equals(
    "created restriction deleted_at should be null or undefined",
    created.deleted_at ?? null,
    null,
  );

  // 3. Update ends_at to a concrete future timestamp
  const oneDayMs = 24 * 60 * 60 * 1000;
  const futureEndsAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + oneDayMs,
  ).toISOString() as string & tags.Format<"date-time">;

  const updateBody = {
    ends_at: futureEndsAt,
  } satisfies ICommunityPlatformAccountRestriction.IUpdate;

  const updated: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.update(
      connection,
      {
        accountRestrictionId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Post-update validations

  // Identity must remain the same
  TestValidator.equals(
    "updated restriction id should match created restriction id",
    updated.id,
    created.id,
  );

  // Business fields other than ends_at should remain stable
  TestValidator.equals(
    "account_type should remain unchanged after ends_at update",
    updated.account_type,
    created.account_type,
  );

  TestValidator.equals(
    "scope should remain unchanged after ends_at update",
    updated.scope,
    created.scope,
  );

  TestValidator.equals(
    "reason_category should remain unchanged after ends_at update",
    updated.reason_category,
    created.reason_category,
  );

  TestValidator.equals(
    "reason_detail should remain unchanged after ends_at update",
    updated.reason_detail ?? null,
    created.reason_detail ?? null,
  );

  TestValidator.equals(
    "starts_at should remain unchanged after ends_at update",
    updated.starts_at,
    created.starts_at,
  );

  // ends_at should now be the concrete future timestamp
  TestValidator.equals(
    "ends_at should be updated from null to the future timestamp",
    updated.ends_at ?? null,
    futureEndsAt,
  );

  // deleted_at should still be null/undefined
  TestValidator.equals(
    "deleted_at should remain null or undefined after ends_at update",
    updated.deleted_at ?? null,
    null,
  );

  // updated_at should be later than created_at
  const createdAtTime = new Date(created.created_at).getTime();
  const updatedAtTime = new Date(updated.updated_at).getTime();

  await TestValidator.predicate(
    "updated_at should be strictly later than created_at",
    async () => updatedAtTime > createdAtTime,
  );

  // Temporal consistency: starts_at <= ends_at
  const startsAtTime = new Date(updated.starts_at).getTime();
  const endsAtTime = new Date(
    typia.assert<string & tags.Format<"date-time">>(
      updated.ends_at ?? futureEndsAt,
    ),
  ).getTime();

  await TestValidator.predicate(
    "restriction window must satisfy starts_at <= ends_at",
    async () => startsAtTime <= endsAtTime,
  );
}
