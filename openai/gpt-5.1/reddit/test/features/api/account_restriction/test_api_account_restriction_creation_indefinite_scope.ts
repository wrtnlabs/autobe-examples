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
 * Validate creation of an indefinite (open-ended) account restriction episode
 * by an adminUser.
 *
 * Business context: Administrative users can register account restriction
 * episodes against accounts (member or admin) using
 * /communityPlatform/adminUser/accountRestrictions. A restriction can be
 * scheduled for a finite window (starts_at to ends_at) or be open-ended by
 * omitting ends_at or explicitly setting it to null. Clients distinguish
 * open-ended restrictions by a null ends_at in the returned
 * ICommunityPlatformAccountRestriction.
 *
 * Test goals:
 *
 * - Ensure that an authenticated adminUser can successfully create a restriction
 *   when ends_at is null.
 * - Ensure the response payload has ends_at === null and starts_at equal to the
 *   requested value.
 * - Ensure system-managed timestamps (created_at, updated_at) are set and that
 *   deleted_at is null for a newly created record.
 * - Sanity-check that core attributes (account_type, scope, reason_category,
 *   optional reason_detail) echo the request payload.
 *
 * End-to-end workflow:
 *
 * 1. Register an adminUser via api.functional.auth.adminUser.join using a random
 *    ICommunityPlatformAdminUserJoin.IRequest payload.
 *
 *    - This call returns ICommunityPlatformAdminuser.IAuthorized.
 *    - The SDK automatically installs the access token into connection.headers, so
 *         subsequent calls are authenticated as this adminUser.
 * 2. Build an ICommunityPlatformAccountRestriction.ICreate payload representing a
 *    typical enforcement:
 *
 *    - Account_type: use a realistic discriminator string such as "member_user" or
 *         "admin_user" (string domain is not constrained by the type but should
 *         be stable and meaningful).
 *    - Scope: choose a plausible scope like "full" or "posting".
 *    - Reason_category: choose a value like "abuse" or "policy_violation".
 *    - Reason_detail: supply a human-readable explanation string.
 *    - Starts_at: set to the current timestamp in ISO 8601 string form (new
 *         Date().toISOString()).
 *    - Ends_at: explicitly null to represent an open-ended restriction.
 * 3. Call api.functional.communityPlatform.adminUser.accountRestrictions.create
 *    with this body.
 * 4. Validate the response:
 *
 *    - Use typia.assert<ICommunityPlatformAccountRestriction>(output) to validate
 *         structural correctness.
 *    - Using TestValidator.equals, assert:
 *
 *         - Output.account_type equals request.account_type.
 *         - Output.scope equals request.scope.
 *         - Output.reason_category equals request.reason_category.
 *         - Output.reason_detail equals request.reason_detail (including null vs string
 *                   semantics).
 *         - Output.starts_at equals request.starts_at.
 *         - Output.ends_at is null.
 *    - Using TestValidator.predicate, assert:
 *
 *         - Created_at and updated_at are non-empty strings (typia.assert already ensures
 *                   date-time format; we only need basic presence semantics).
 *         - Deleted_at is either undefined or null (for a new record we expect no soft
 *                   deletion).
 *    - Optionally use TestValidator.predicate to assert that output.created_at <=
 *         output.updated_at in lexical comparison, as both are ISO date-time
 *         strings.
 *
 * Notes and constraints:
 *
 * - Do not manipulate connection.headers manually; rely on the SDK behavior from
 *   the join call.
 * - Use const objects with `satisfies` for request DTOs; don’t add type
 *   annotations on the variables.
 * - Do not perform type-errortests (e.g., wrong types or missing required
 *   fields); only test successful creation.
 */
export async function test_api_account_restriction_creation_indefinite_scope(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authenticated context.
  const joinRequest = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const authorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorized);

  // 2. Build an ICommunityPlatformAccountRestriction.ICreate payload
  // representing an indefinite restriction.
  const nowIso = new Date().toISOString();
  const createBody = {
    account_type: "member_user",
    scope: "full",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: nowIso,
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  // 3. Call the account restriction creation endpoint.
  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(restriction);

  // 4. Validate that this is an indefinite restriction and attributes echo.
  TestValidator.equals(
    "account_type should echo the request payload",
    restriction.account_type,
    createBody.account_type,
  );
  TestValidator.equals(
    "scope should echo the request payload",
    restriction.scope,
    createBody.scope,
  );
  TestValidator.equals(
    "reason_category should echo the request payload",
    restriction.reason_category,
    createBody.reason_category,
  );
  TestValidator.equals(
    "reason_detail should echo the request payload (including null semantics)",
    restriction.reason_detail ?? null,
    createBody.reason_detail ?? null,
  );
  TestValidator.equals(
    "starts_at should echo the requested start timestamp",
    restriction.starts_at,
    createBody.starts_at,
  );
  TestValidator.equals(
    "ends_at must be null for an indefinite restriction",
    restriction.ends_at ?? null,
    null,
  );

  // System-managed timestamps and deletion flag.
  TestValidator.predicate(
    "created_at should be a non-empty ISO date-time string",
    restriction.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty ISO date-time string",
    restriction.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at should be null or undefined for a fresh restriction",
    restriction.deleted_at === null || restriction.deleted_at === undefined,
  );

  // Optional sanity check: created_at should not be after updated_at in
  // lexicographical comparison when both are ISO timestamps.
  TestValidator.predicate(
    "created_at should be less than or equal to updated_at lexicographically",
    restriction.created_at <= restriction.updated_at,
  );
}
