import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test listing all roles within the organization with default pagination.
 *
 * This test validates:
 * 1. Member authentication using join endpoint
 * 2. Roles list endpoint returns all roles with default pagination
 * 3. Three built-in roles (Owner, Manager, Employee) are present and ordered first
 * 4. Pagination metadata is correctly returned
 * 5. Each role has required properties: id, name, isBuiltin, createdAt, organization, permissionsCount
 */
export async function test_api_roles_list_with_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Call roles list endpoint with empty request body (default pagination)
  const rolesResponse = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(rolesResponse);
  // 3. Validate pagination metadata is present
  TestValidator.equals(
    "pagination exists",
    rolesResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination has current page",
    rolesResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    rolesResponse.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    rolesResponse.pagination.records >= 3,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    rolesResponse.pagination.pages >= 1,
    true,
  );
  // 4. Validate data array exists and has roles
  TestValidator.equals(
    "data array exists",
    Array.isArray(rolesResponse.data),
    true,
  );
  TestValidator.predicate(
    "has at least 3 roles (built-in)",
    rolesResponse.data.length >= 3,
  );
  // 5. Validate first 3 roles are built-in roles in correct order
  const firstThreeRoles = rolesResponse.data.slice(0, 3);
  TestValidator.equals(
    "first 3 roles are all built-in",
    firstThreeRoles.every((role) => role.isBuiltin === true),
    true,
  );
  // 6. Validate built-in role names are Owner, Manager, Employee in order
  const builtInRoleNames = ["Owner", "Manager", "Employee"];
  for (let i = 0; i < 3; i++) {
    TestValidator.equals(
      `built-in role ${i + 1} name`,
      rolesResponse.data[i].name,
      builtInRoleNames[i],
    );
  }
  // 7. Validate each role has required properties
  for (const role of rolesResponse.data) {
    // Validate role structure
    TestValidator.predicate(
      "role has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        role.id,
      ),
    );
    TestValidator.predicate("role has non-empty name", role.name.length > 0);
    TestValidator.equals(
      "role has isBuiltin boolean",
      typeof role.isBuiltin === "boolean",
      true,
    );
    TestValidator.predicate(
      "role has valid createdAt",
      !isNaN(Date.parse(role.createdAt)),
    );
    TestValidator.equals(
      "role has organization",
      role.organization !== null,
      true,
    );
    TestValidator.equals(
      "role has organization id",
      role.organization.id !== undefined,
      true,
    );
    TestValidator.equals(
      "role has permissionsCount",
      typeof role.permissionsCount === "number",
      true,
    );
    TestValidator.predicate(
      "permissionsCount is non-negative",
      role.permissionsCount >= 0,
    );
  }
  // 8. Verify built-in roles have specific permission counts
  const ownerRole = rolesResponse.data.find((r) => r.name === "Owner");
  const managerRole = rolesResponse.data.find((r) => r.name === "Manager");
  const employeeRole = rolesResponse.data.find((r) => r.name === "Employee");
  TestValidator.predicate("Owner role exists", ownerRole !== undefined);
  TestValidator.predicate("Manager role exists", managerRole !== undefined);
  TestValidator.predicate("Employee role exists", employeeRole !== undefined);
  // Owner should have most permissions (full access)
  // Manager and Employee should have progressively fewer permissions
  if (ownerRole && managerRole && employeeRole) {
    TestValidator.predicate(
      "Owner has permissions",
      ownerRole.permissionsCount > 0,
    );
    TestValidator.predicate(
      "Manager has permissions",
      managerRole.permissionsCount > 0,
    );
    TestValidator.predicate(
      "Employee has permissions",
      employeeRole.permissionsCount > 0,
    );
  }
}
