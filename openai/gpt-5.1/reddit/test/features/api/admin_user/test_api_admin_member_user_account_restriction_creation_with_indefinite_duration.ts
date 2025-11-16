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
 * Validate creation of an indefinite account restriction for a member user by
 * an adminUser.
 *
 * Business goal: Ensure that an administrative actor can establish an
 * open-ended (no end time) restriction window and apply it to a specific member
 * user, and that the resulting restriction episode is shaped correctly (ends_at
 * null, correct account_type/scope/reason fields, timestamps populated) when
 * created via both the generic admin restriction endpoint and the
 * member-user-specific endpoint.
 *
 * Test flow:
 *
 * 1. Register a new adminUser using POST /auth/adminUser/join to obtain an
 *    authorized admin context.
 * 2. Using that admin context, call POST
 *    /communityPlatform/adminUser/accountRestrictions with a body satisfying
 *    ICommunityPlatformAccountRestriction.ICreate to create a generic
 *    restriction episode whose ends_at is explicitly null to represent an
 *    indefinite window.
 * 3. Assert that the returned ICommunityPlatformAccountRestriction has:
 *
 *    - Ends_at === null (indefinite restriction)
 *    - Created_at and updated_at set to valid date-time strings
 *    - Account_type/scope/reason_category echoing the request payload.
 * 4. Assume the existence of a valid member user identified by username (provided
 *    by external fixtures or test data seeding); for this E2E test, just use a
 *    deterministic username string constant since the backend is responsible
 *    for resolving it, and the focus here is the restriction creation
 *    contract.
 * 5. With the same admin context, call POST
 *    /communityPlatform/adminUser/memberUsers/{username}/accountRestrictions
 *    using
 *    api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create
 *    with:
 *
 *    - Props.username set to that known username
 *    - Props.body satisfying ICommunityPlatformAccountRestriction.ICreate with
 *         ends_at omitted (so it will either default to null or be treated as
 *         null), representing another indefinite restriction episode.
 * 6. Validate that the response:
 *
 *    - Is a valid ICommunityPlatformAccountRestriction via typia.assert
 *    - Has ends_at === null, signifying indefinite duration
 *    - Has account_type/scope/reason_category matching the request
 *    - Has memberUserRestriction populated (non-null/undefined) and that its
 *         community_platform_account_restriction_id equals the restriction id,
 *         confirming that the restriction is linked to the target member user.
 * 7. Additionally, assert that createdByAdminUser, when present, refers to the
 *    same admin id obtained from the join step.
 */
export async function test_api_admin_member_user_account_restriction_creation_with_indefinite_duration(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser to obtain an authorized admin context
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a generic account restriction with explicit ends_at null
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const genericRestrictionBody = {
    account_type: "memberUser",
    scope: "full",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
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
  typia.assert<ICommunityPlatformAccountRestriction>(genericRestriction);

  TestValidator.equals(
    "generic restriction ends_at should be null for indefinite duration",
    genericRestriction.ends_at ?? null,
    null,
  );

  TestValidator.equals(
    "generic restriction account_type echoes request",
    genericRestriction.account_type,
    genericRestrictionBody.account_type,
  );
  TestValidator.equals(
    "generic restriction scope echoes request",
    genericRestriction.scope,
    genericRestrictionBody.scope,
  );
  TestValidator.equals(
    "generic restriction reason_category echoes request",
    genericRestriction.reason_category,
    genericRestrictionBody.reason_category,
  );

  // Validate timestamps are present via typia (already done) and basic
  // business expectation that created_at/updated_at exist and are strings.
  await TestValidator.predicate(
    "generic restriction created_at is non-empty",
    () =>
      typeof genericRestriction.created_at === "string" &&
      genericRestriction.created_at.length > 0,
  );
  await TestValidator.predicate(
    "generic restriction updated_at is non-empty",
    () =>
      typeof genericRestriction.updated_at === "string" &&
      genericRestriction.updated_at.length > 0,
  );

  // 3. Prepare a known member username; in real tests this would correspond to
  // an existing member user seeded by fixtures. Here we just use a deterministic
  // value assuming the backend mock/simulator will resolve it.
  const memberUsername: string = `member_${RandomGenerator.alphaNumeric(8)}`;

  // 4. Create a member-user-specific indefinite restriction omitting ends_at
  const memberRestrictionBody = {
    account_type: "memberUser",
    scope: "full",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    starts_at: nowIso,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const memberRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username: memberUsername,
        body: memberRestrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(memberRestriction);

  // 5. Assert ends_at is null (indefinite) and fields echo the request
  TestValidator.equals(
    "member restriction ends_at should be null when omitted in request body",
    memberRestriction.ends_at ?? null,
    null,
  );
  TestValidator.equals(
    "member restriction account_type echoes request",
    memberRestriction.account_type,
    memberRestrictionBody.account_type,
  );
  TestValidator.equals(
    "member restriction scope echoes request",
    memberRestriction.scope,
    memberRestrictionBody.scope,
  );
  TestValidator.equals(
    "member restriction reason_category echoes request",
    memberRestriction.reason_category,
    memberRestrictionBody.reason_category,
  );

  // 6. Validate that memberUserRestriction linkage is populated and points back
  // to this restriction id.
  await TestValidator.predicate(
    "member restriction has memberUserRestriction linkage populated",
    () =>
      memberRestriction.memberUserRestriction !== null &&
      memberRestriction.memberUserRestriction !== undefined,
  );

  if (
    memberRestriction.memberUserRestriction !== null &&
    memberRestriction.memberUserRestriction !== undefined
  ) {
    const linkage = memberRestriction.memberUserRestriction;
    typia.assert<ICommunityPlatformAccountRestrictionOfMemberUser.ISummary>(
      linkage,
    );

    TestValidator.equals(
      "memberUserRestriction.community_platform_account_restriction_id matches restriction id",
      linkage.community_platform_account_restriction_id,
      memberRestriction.id,
    );
  }

  // 7. When createdByAdminUser is present, ensure it refers to the same admin
  await TestValidator.predicate(
    "createdByAdminUser is either absent or refers to the creating admin",
    () => {
      const createdBy = memberRestriction.createdByAdminUser ?? null;
      if (createdBy === null) return true;
      typia.assert<ICommunityPlatformAdminuser.ISummary>(createdBy);
      return createdBy.id === adminAuthorized.id;
    },
  );
}
