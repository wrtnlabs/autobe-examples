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
 * Validate extending the duration of an admin user's account restriction.
 *
 * Business workflow covered by this E2E test:
 *
 * 1. Register an acting adminUser via /auth/adminUser/join and obtain an
 *    authorized session.
 * 2. Create a generic account restriction episode via
 *    /communityPlatform/adminUser/accountRestrictions.
 * 3. Create a restriction episode specifically linked to a target adminUser via
 *    /communityPlatform/adminUser/adminUsers/{username}/accountRestrictions.
 * 4. Prepare an update payload that extends the ends_at of the admin-user-scoped
 *    restriction.
 * 5. Call the update endpoint
 *    /communityPlatform/adminUser/adminUsers/{username}/accountRestrictions/{accountRestrictionId}.
 * 6. Assert that the response reflects the extended restriction window while
 *    preserving identity and core attributes.
 */
export async function test_api_admin_account_restriction_update_extend_duration(
  connection: api.IConnection,
) {
  // 1. Register an acting adminUser (also serves as the target adminUser)
  const joinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(adminAuthorized);

  const username: string = adminAuthorized.username;

  // 2. Create a generic account restriction episode
  const now = new Date();
  const startsAt = new Date(now.getTime()).toISOString();
  const initialEnds = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour

  const createGenericBody = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: initialEnds,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const genericRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: createGenericBody,
      },
    );
  typia.assert(genericRestriction);

  // 3. Create an adminUser-linked restriction episode for this username
  const createAdminLinkedBody = {
    account_type: "adminUser",
    scope: genericRestriction.scope,
    reason_category: genericRestriction.reason_category,
    reason_detail: genericRestriction.reason_detail ?? null,
    starts_at: genericRestriction.starts_at,
    ends_at: genericRestriction.ends_at ?? null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const adminLinkedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username,
        body: createAdminLinkedBody,
      },
    );
  typia.assert(adminLinkedRestriction);

  // Snapshot pre-update values for comparison
  const beforeId = adminLinkedRestriction.id;
  const beforeAccountType = adminLinkedRestriction.account_type;
  const beforeScope = adminLinkedRestriction.scope;
  const beforeReasonCategory = adminLinkedRestriction.reason_category;
  const beforeReasonDetail = adminLinkedRestriction.reason_detail ?? null;
  const beforeStartsAt = adminLinkedRestriction.starts_at;
  const beforeEndsAt = adminLinkedRestriction.ends_at ?? null;
  const beforeCreatedAt = adminLinkedRestriction.created_at;
  const beforeUpdatedAt = adminLinkedRestriction.updated_at;

  // 4. Prepare an update payload that extends ends_at
  const baseForExtension = beforeEndsAt !== null ? new Date(beforeEndsAt) : now;
  const extendedEndsAt = new Date(
    baseForExtension.getTime() + 60 * 60 * 1000,
  ).toISOString(); // extend by +1 hour

  const updateBody = {
    ends_at: extendedEndsAt,
  } satisfies ICommunityPlatformAccountRestriction.IUpdate;

  // 5. Call the update endpoint
  const updatedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.update(
      connection,
      {
        username,
        accountRestrictionId: adminLinkedRestriction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRestriction);

  // 6. Business assertions

  // Identity and core classification remain stable
  TestValidator.equals(
    "restriction id must remain unchanged",
    updatedRestriction.id,
    beforeId,
  );

  TestValidator.equals(
    "account_type must remain unchanged",
    updatedRestriction.account_type,
    beforeAccountType,
  );

  TestValidator.equals(
    "scope must remain unchanged",
    updatedRestriction.scope,
    beforeScope,
  );

  TestValidator.equals(
    "reason_category must remain unchanged",
    updatedRestriction.reason_category,
    beforeReasonCategory,
  );

  TestValidator.equals(
    "reason_detail must remain unchanged",
    updatedRestriction.reason_detail ?? null,
    beforeReasonDetail,
  );

  TestValidator.equals(
    "starts_at must remain unchanged",
    updatedRestriction.starts_at,
    beforeStartsAt,
  );

  // ends_at should be updated to the extended value
  TestValidator.equals(
    "ends_at must be updated to the extended value",
    updatedRestriction.ends_at ?? null,
    extendedEndsAt,
  );

  // created_at should remain the same, updated_at should change
  TestValidator.equals(
    "created_at must remain unchanged",
    updatedRestriction.created_at,
    beforeCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at must change after update",
    updatedRestriction.updated_at,
    beforeUpdatedAt,
  );

  // If linkage objects are present, ensure they still exist and refer to same restriction id
  if (updatedRestriction.adminUserRestriction) {
    TestValidator.equals(
      "adminUserRestriction should still reference same restriction id",
      updatedRestriction.adminUserRestriction
        .community_platform_account_restriction_id,
      beforeId,
    );
  }

  if (updatedRestriction.createdByAdminUser) {
    TestValidator.predicate(
      "createdByAdminUser id should be a non-empty uuid-like string",
      typeof updatedRestriction.createdByAdminUser.id === "string" &&
        updatedRestriction.createdByAdminUser.id.length > 0,
    );
  }
}
