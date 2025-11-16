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
 * Validate that an authenticated adminUser can create a basic account
 * restriction episode and that core business and system fields are populated
 * correctly.
 *
 * Business context
 *
 * - Admin users (adminUser) can impose restriction episodes (suspension, bans,
 *   etc.) that are stored in community_platform_account_restrictions.
 * - A restriction is characterized by: account_type, scope, reason_category,
 *   optional reason_detail, and a temporal window (starts_at, optional
 *   ends_at).
 * - The creation endpoint is only available to authenticated adminUser actors and
 *   automatically associates the created restriction with the acting admin via
 *   community_platform_adminuser_id and createdByAdminUser.
 *
 * Scenario steps
 *
 * 1. Register a fresh adminUser via POST /auth/adminUser/join using
 *    ICommunityPlatformAdminUserJoin.IRequest. This returns
 *    ICommunityPlatformAdminuser.IAuthorized and sets the Authorization header
 *    for the connection.
 * 2. Build a minimal, valid restriction creation payload using
 *    ICommunityPlatformAccountRestriction.ICreate:
 *
 *    - Account_type: a free-form discriminator like "member" or "admin".
 *    - Scope: a business scope string such as "login" or "full".
 *    - Reason_category: a category string such as "abuse" or "policy_violation".
 *    - Reason_detail: optional human-readable detail, provide a short paragraph.
 *    - Starts_at: current time in ISO 8601 date-time format (Date.toISOString()).
 *    - Ends_at: some time in the future (e.g., +1 day) in ISO 8601 format.
 * 3. Call POST /communityPlatform/adminUser/accountRestrictions through
 *    api.functional.communityPlatform.adminUser.accountRestrictions.create
 *    using the authenticated adminUser connection and the constructed payload.
 * 4. Assert that the response conforms to ICommunityPlatformAccountRestriction
 *    using typia.assert and then perform focused business validations:
 *
 *    - Echo validation: account_type, scope, reason_category, reason_detail,
 *         starts_at, and ends_at in the response match the request payload.
 *    - System fields validation:
 *
 *         - Id is a UUID string (implicitly validated by typia.assert).
 *         - Created_at and updated_at are present and formatted as date-time.
 *         - Community_platform_adminuser_id is non-null and equals the adminUser.id from
 *                   the join response.
 *         - CreatedByAdminUser is non-null, with id equal to adminUser.id and a non-empty
 *                   displayName.
 *    - Temporal window validity: if ends_at is non-null, then starts_at <= ends_at
 *         (string comparison using Date objects).
 * 5. Ensure no further side-effect calls are required; retrieval by id is left to
 *    other scenarios.
 */
export async function test_api_account_restriction_creation_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a fresh adminUser (happy-path join)
  const joinRequestBody =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(adminAuthorized);

  // 2. Construct a valid restriction creation payload
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const createBody = {
    account_type: "member",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  // 3. Call create endpoint as authenticated adminUser
  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: createBody },
    );
  typia.assert(restriction);

  // 4-1. Echo validation of core business fields
  TestValidator.equals(
    "account_type is echoed from request",
    restriction.account_type,
    createBody.account_type,
  );
  TestValidator.equals(
    "scope is echoed from request",
    restriction.scope,
    createBody.scope,
  );
  TestValidator.equals(
    "reason_category is echoed from request",
    restriction.reason_category,
    createBody.reason_category,
  );
  TestValidator.equals(
    "reason_detail is echoed from request",
    restriction.reason_detail ?? null,
    createBody.reason_detail ?? null,
  );
  TestValidator.equals(
    "starts_at is echoed from request",
    restriction.starts_at,
    createBody.starts_at,
  );
  TestValidator.equals(
    "ends_at is echoed from request",
    restriction.ends_at ?? null,
    createBody.ends_at ?? null,
  );

  // 4-2. System fields validation
  TestValidator.predicate(
    "restriction.id should be a non-empty string",
    restriction.id.length > 0,
  );

  TestValidator.predicate(
    "restriction.created_at should be non-empty",
    restriction.created_at.length > 0,
  );
  TestValidator.predicate(
    "restriction.updated_at should be non-empty",
    restriction.updated_at.length > 0,
  );

  // community_platform_adminuser_id must be non-null and match admin id
  TestValidator.predicate(
    "community_platform_adminuser_id is non-null",
    restriction.community_platform_adminuser_id !== null,
  );
  if (restriction.community_platform_adminuser_id !== null) {
    TestValidator.equals(
      "community_platform_adminuser_id matches adminAuthorized.id",
      restriction.community_platform_adminuser_id,
      adminAuthorized.id,
    );
  }

  // createdByAdminUser should be populated consistently
  TestValidator.predicate(
    "createdByAdminUser is present",
    restriction.createdByAdminUser !== null &&
      restriction.createdByAdminUser !== undefined,
  );
  if (
    restriction.createdByAdminUser !== null &&
    restriction.createdByAdminUser !== undefined
  ) {
    TestValidator.equals(
      "createdByAdminUser.id matches adminAuthorized.id",
      restriction.createdByAdminUser.id,
      adminAuthorized.id,
    );
    TestValidator.predicate(
      "createdByAdminUser.displayName is non-empty",
      restriction.createdByAdminUser.displayName.length > 0,
    );
  }

  // 4-3. Temporal window validity: starts_at <= ends_at when ends_at is not null
  if (restriction.ends_at !== null && restriction.ends_at !== undefined) {
    const starts = new Date(restriction.starts_at).getTime();
    const ends = new Date(restriction.ends_at).getTime();
    TestValidator.predicate(
      "restriction temporal window has starts_at <= ends_at",
      starts <= ends,
    );
  }
}
