import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRoleAssignment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";

export async function test_api_admin_role_assignment_search_by_granting_admin(
  connection: api.IConnection,
) {
  // 1. Join target admin first (just a subject of role assignment)
  const adminTargetJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-target.example.com/join",
    referrer: "https://admin-landing.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminTarget: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminTargetJoinBody,
    });
  typia.assert(adminTarget);

  // 2. Join granting admin second so subsequent privileged operations
  // (role creation and assignment) are performed as this admin.
  const adminGranterJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-granter.example.com/join",
    referrer: "https://admin-landing.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminGranter: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminGranterJoinBody,
    });
  typia.assert(adminGranter);

  // 3. As adminGranter, create an admin role
  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: {
        code: `role_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        is_system: false,
      } satisfies IShoppingMallAdminRole.ICreate,
    });
  typia.assert(createdRole);

  // 4. As adminGranter, assign the role to adminTarget
  const createdAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: createdRole.code,
        body: {
          admin_id: adminTarget.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminRoleAssignment.ICreate,
      },
    );
  typia.assert(createdAssignment);

  // 5. Join a different granting admin and create another assignment
  // to verify that filtering by granted_by_admin_id excludes their grants.
  const otherGranterJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-other-granter.example.com/join",
    referrer: "https://admin-landing.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const otherGranter: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: otherGranterJoinBody,
    });
  typia.assert(otherGranter);

  const otherRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: {
        code: `role_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        is_system: false,
      } satisfies IShoppingMallAdminRole.ICreate,
    });
  typia.assert(otherRole);

  const otherAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: otherRole.code,
        body: {
          admin_id: adminTarget.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminRoleAssignment.ICreate,
      },
    );
  typia.assert(otherAssignment);

  // 6. Search assignments filtered by granted_by_admin_id = adminGranter.id
  // Caller at this moment is otherGranter (last join), but filtering
  // semantics are independent of who performs the search.
  const page: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.admin.adminRoleAssignments.index(
      connection,
      {
        body: {
          page: 0,
          limit: 10,
          granted_by_admin_id: adminGranter.id,
        } satisfies IShoppingMallAdminRoleAssignment.IRequest,
      },
    );
  typia.assert(page);

  // 7. Validate that the created assignment is present and matches expectations
  const matched = page.data.find((summary) => {
    return (
      summary.id === createdAssignment.id &&
      summary.admin.id === adminTarget.id &&
      summary.role.code === createdRole.code &&
      summary.granted_by_admin_id === adminGranter.id
    );
  });

  TestValidator.predicate(
    "filtered result should contain assignment granted by adminGranter to adminTarget",
    matched !== undefined,
  );

  // Ensure that assignments granted by otherGranter are not present
  // when filtering by adminGranter.id
  const hasOtherGranterAssignment = page.data.some((summary) => {
    return summary.granted_by_admin_id === otherGranter.id;
  });

  TestValidator.predicate(
    "filtered result should not contain assignments granted by otherGranter",
    hasOtherGranterAssignment === false,
  );
}
