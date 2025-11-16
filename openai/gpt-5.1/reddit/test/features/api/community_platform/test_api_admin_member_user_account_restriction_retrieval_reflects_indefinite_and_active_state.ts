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
 * Validate retrieval of an indefinite member user account restriction.
 *
 * Business purpose:
 *
 * - Ensure that an administrative actor (adminUser) can create an account
 *   restriction whose temporal window is open-ended (ends_at = null).
 * - Ensure that when such a restriction is applied to a member user via the
 *   username-scoped endpoint, the retrieval API reflects the same open-ended
 *   temporal semantics and exposes member-user linkage information.
 *
 * Covered flow:
 *
 * 1. Register an adminUser via /auth/adminUser/join to obtain an authorized admin
 *    context (SDK manages Authorization header).
 * 2. Create a generic account restriction episode with account_type set to a
 *    concrete string (e.g., "memberUser"), scope "full", reason_category
 *    "abuse", starts_at now, and ends_at explicitly null.
 * 3. Attach a member-user-scoped restriction for a chosen username via POST
 *    /communityPlatform/adminUser/memberUsers/{username}/accountRestrictions
 *    using an ICommunityPlatformAccountRestriction.ICreate body with the same
 *    semantics (starts_at <= now, ends_at null).
 * 4. Retrieve the restriction via GET
 *    /communityPlatform/adminUser/memberUsers/{username}/accountRestrictions/{accountRestrictionId}
 *    using the id from step 3.
 * 5. Assert that the retrieved ICommunityPlatformAccountRestriction:
 *
 *    - Has the same id as in step 3.
 *    - Has account_type, scope, and reason_category consistent with creation.
 *    - Has ends_at null, confirming an indefinite window.
 *    - Has starts_at not in the future.
 *    - Has created_at and updated_at present and updated_at >= created_at.
 *    - Has memberUserRestriction populated (not null/undefined), so clients can see
 *         member-specific linkage summary.
 * 6. Derive an "active" boolean from the timestamps (now >= starts_at and ends_at
 *    == null) and assert this is true, demonstrating that clients can treat
 *    this restriction as currently active based solely on returned fields.
 */
export async function test_api_admin_member_user_account_restriction_retrieval_reflects_indefinite_and_active_state(
  connection: api.IConnection,
) {
  // 1. AdminUser join to obtain authorized admin context
  const joinRequest = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Create a generic indefinite account restriction episode
  const now = new Date();
  const nowIso = now.toISOString();

  const genericRestrictionBody = {
    account_type: "memberUser",
    scope: "full",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: nowIso,
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const genericRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: genericRestrictionBody,
      },
    );
  typia.assert(genericRestriction);

  TestValidator.equals(
    "generic restriction ends_at should be null (indefinite)",
    genericRestriction.ends_at ?? null,
    null,
  );
  TestValidator.equals(
    "generic restriction account_type echoes input",
    genericRestriction.account_type,
    genericRestrictionBody.account_type,
  );
  TestValidator.equals(
    "generic restriction scope echoes input",
    genericRestriction.scope,
    genericRestrictionBody.scope,
  );
  TestValidator.equals(
    "generic restriction reason_category echoes input",
    genericRestriction.reason_category,
    genericRestrictionBody.reason_category,
  );

  // 3. Attach a member-user-scoped restriction for a chosen username
  const username: string = RandomGenerator.name(1).replace(/\s+/g, "_");

  const memberRestrictionBody = {
    account_type: genericRestrictionBody.account_type,
    scope: genericRestrictionBody.scope,
    reason_category: genericRestrictionBody.reason_category,
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: nowIso,
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const memberRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username,
        body: memberRestrictionBody,
      },
    );
  typia.assert(memberRestriction);

  TestValidator.equals(
    "member restriction ends_at should be null (indefinite)",
    memberRestriction.ends_at ?? null,
    null,
  );
  TestValidator.equals(
    "member restriction account_type echoes input",
    memberRestriction.account_type,
    memberRestrictionBody.account_type,
  );

  // 4. Retrieve the restriction via member-user-scoped GET
  const retrieved: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.at(
      connection,
      {
        username,
        accountRestrictionId: memberRestriction.id,
      },
    );
  typia.assert(retrieved);

  // 5. Structural and consistency assertions
  TestValidator.equals(
    "retrieved restriction id matches created member restriction id",
    retrieved.id,
    memberRestriction.id,
  );
  TestValidator.equals(
    "retrieved account_type matches created",
    retrieved.account_type,
    memberRestrictionBody.account_type,
  );
  TestValidator.equals(
    "retrieved scope matches created",
    retrieved.scope,
    memberRestrictionBody.scope,
  );
  TestValidator.equals(
    "retrieved reason_category matches created",
    retrieved.reason_category,
    memberRestrictionBody.reason_category,
  );
  TestValidator.equals(
    "retrieved ends_at remains null (indefinite)",
    retrieved.ends_at ?? null,
    null,
  );

  // starts_at should not be in the future
  const retrievedStartsAtTime = Date.parse(retrieved.starts_at);
  const nowTime = now.getTime();
  TestValidator.predicate(
    "retrieved starts_at should not be in the future",
    retrievedStartsAtTime <= nowTime,
  );

  // created_at and updated_at consistency: updated_at should be >= created_at
  const createdAtTime = Date.parse(retrieved.created_at);
  const updatedAtTime = Date.parse(retrieved.updated_at);
  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    updatedAtTime >= createdAtTime,
  );

  // memberUserRestriction linkage should be present for member-scoped retrieval
  const memberUserRestrictionSummary:
    | ICommunityPlatformAccountRestrictionOfMemberUser.ISummary
    | null
    | undefined = retrieved.memberUserRestriction;
  TestValidator.predicate(
    "memberUserRestriction linkage summary should be present",
    memberUserRestrictionSummary !== null &&
      memberUserRestrictionSummary !== undefined,
  );

  // 6. Derived "active" semantics: now >= starts_at and ends_at == null
  const isActiveByWindow: boolean =
    retrievedStartsAtTime <= nowTime && retrieved.ends_at == null;
  TestValidator.predicate(
    "restriction should be active based on temporal window (starts_at <= now and ends_at null)",
    isActiveByWindow,
  );
}
