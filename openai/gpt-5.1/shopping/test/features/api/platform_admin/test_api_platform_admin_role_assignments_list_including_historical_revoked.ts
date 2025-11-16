import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRoleAssignment";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_role_assignments_list_including_historical_revoked(
  connection: api.IConnection,
) {
  // 1. Bootstrap: create Admin A (caller) to establish platformAdmin auth context.
  const adminAJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminA);

  // 2. Create at least one admin role definition to reflect realistic setup.
  const roleCreateBody = {
    code: `ROLE_${RandomGenerator.alphabets(8).toUpperCase()}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminRole>(createdRole);

  // 3. Create Admin B, whose assignments will be inspected.
  const adminBJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminB);

  // 4. List role assignments for Admin B with active_only = false to include
  //    both active and historical (revoked) assignments when present.
  const listAllRequestBody = {
    page: 1,
    limit: 50,
    active_only: false,
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;

  const allAssignmentsPage: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.index(
      connection,
      {
        platformAdminId: adminB.id,
        body: listAllRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallAdminRoleAssignment.ISummary>(
    allAssignmentsPage,
  );

  const allAssignments: IShoppingMallAdminRoleAssignment.ISummary[] =
    allAssignmentsPage.data;

  // Basic sanity check: pagination should be consistent with data length.
  TestValidator.predicate(
    "records >= data length",
    () => allAssignmentsPage.pagination.records >= allAssignments.length,
  );

  // 5. Analyze active vs inactive assignments to validate lifecycle flags.
  const activeAssignments = allAssignments.filter((a) => a.is_active === true);
  const inactiveAssignments = allAssignments.filter(
    (a) => a.is_active === false,
  );

  // If there are active assignments, each should have null/undefined expires_at.
  if (activeAssignments.length > 0) {
    TestValidator.predicate(
      "active assignments must have null or undefined expires_at",
      () =>
        activeAssignments.every(
          (a) => a.expires_at === null || a.expires_at === undefined,
        ),
    );
  }

  // If there are inactive assignments, each should have non-null expires_at.
  if (inactiveAssignments.length > 0) {
    TestValidator.predicate(
      "inactive assignments must have non-null expires_at",
      () =>
        inactiveAssignments.every(
          (a) => a.expires_at !== null && a.expires_at !== undefined,
        ),
    );
  }

  // 6. Additional verification: when active_only is true, all returned
  //    assignments (if any) should be active.
  const listActiveOnlyBody = {
    page: 1,
    limit: 50,
    active_only: true,
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;

  const activeOnlyPage: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.index(
      connection,
      {
        platformAdminId: adminB.id,
        body: listActiveOnlyBody,
      },
    );
  typia.assert<IPageIShoppingMallAdminRoleAssignment.ISummary>(activeOnlyPage);

  const activeOnlyAssignments: IShoppingMallAdminRoleAssignment.ISummary[] =
    activeOnlyPage.data;

  if (activeOnlyAssignments.length > 0) {
    TestValidator.predicate(
      "active_only=true should return only active assignments",
      () => activeOnlyAssignments.every((a) => a.is_active === true),
    );
  }
}
