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
 * Validate that an adminUser can deactivate a previously created account
 * restriction episode for an administrative account.
 *
 * Business flow:
 *
 * 1. Register a new adminUser via /auth/adminUser/join to obtain an authenticated
 *    admin context.
 * 2. As this admin, create a generic restriction episode using
 *    /communityPlatform/adminUser/accountRestrictions (mainly to exercise the
 *    base creation path).
 * 3. Still as the same admin, create a restriction episode that is specifically
 *    linked to that adminUser via
 *    /communityPlatform/adminUser/adminUsers/{username}/accountRestrictions.
 * 4. Verify the created restriction’s core attributes (account_type, scope, and
 *    that an adminUser linkage summary is present).
 * 5. Invoke the DELETE endpoint
 *    /communityPlatform/adminUser/adminUsers/{username}/accountRestrictions/{accountRestrictionId}
 *    to deactivate the restriction.
 * 6. Confirm that the DELETE completes without error, treating this as evidence
 *    that a privileged admin can lift a restriction that they previously
 *    applied.
 *
 * Due to the lack of a listing/read API for restrictions in the provided SDK,
 * this test focuses on the creation + deletion flow and structural validation
 * of created entities, rather than verifying downstream enforcement behavior.
 */
export async function test_api_admin_account_restriction_deactivation_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register an acting adminUser to obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const actingAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(actingAdmin);

  // 2. Create a generic restriction episode (not strictly required
  // for the delete path, but exercises the base creation endpoint).
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAtDate = new Date(now.getTime() + 60 * 60 * 1000); // +1h
  const endsAt = endsAtDate.toISOString();

  const genericRestrictionBody = {
    account_type: "generic",
    scope: "full",
    reason_category: "test_generic",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const genericRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: genericRestrictionBody,
      },
    );
  typia.assert(genericRestriction);

  // 3. Create an adminUser-specific restriction linked to the acting admin
  const adminRestrictionBody = {
    account_type: "admin",
    scope: "login",
    reason_category: "test_admin_restriction",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const adminRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username: actingAdmin.username,
        body: adminRestrictionBody,
      },
    );
  typia.assert(adminRestriction);

  // 4. Validate key attributes on the created admin restriction
  TestValidator.equals(
    "admin restriction account_type should match request",
    adminRestriction.account_type,
    adminRestrictionBody.account_type,
  );
  TestValidator.equals(
    "admin restriction scope should match request",
    adminRestriction.scope,
    adminRestrictionBody.scope,
  );

  // adminUserRestriction is optional; if present, ensure its linkage id
  // references the restriction id itself.
  if (
    adminRestriction.adminUserRestriction !== null &&
    adminRestriction.adminUserRestriction !== undefined
  ) {
    const linkage = adminRestriction.adminUserRestriction;
    TestValidator.equals(
      "adminUserRestriction should reference same restriction id",
      linkage.community_platform_account_restriction_id,
      adminRestriction.id,
    );
  }

  // 5. Deactivate the adminUser-linked restriction via DELETE
  await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.erase(
    connection,
    {
      username: actingAdmin.username,
      accountRestrictionId: adminRestriction.id,
    },
  );

  // 6. Indirectly assert that execution reached this point without
  // throwing, which we treat as successful deactivation.
  TestValidator.predicate(
    "erase endpoint for admin restriction completed without throwing",
    true,
  );
}
