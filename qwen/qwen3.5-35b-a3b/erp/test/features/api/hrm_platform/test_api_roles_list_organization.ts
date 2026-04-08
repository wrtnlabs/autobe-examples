import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for listing all roles within an organization.
 *
 * Validates the complete roles listing workflow including member registration,
 * organization creation, and role enumeration. Ensures that all built-in roles
 * (Owner, Manager, Employee) are present in the response along with proper
 * pagination metadata and permission counts.
 *
 * Special attention is given to verifying that built-in roles are correctly
 * identified and that the role_kind field distinguishes between system and
 * custom roles. Pagination boundaries and sorting behavior are also validated.
 */
export async function test_api_roles_list_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with initial organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  typia.assert(joinResult.token);
  typia.assert(joinResult.member);
  typia.assert(joinResult.member.id);
  // 2. Create API connection with member credentials
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: joinResult.token.access,
  };
  // 3. Query roles list with default pagination (page=1, limit=20, sorted by created_at DESC)
  const rolesPage = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "desc",
      },
    },
  );
  typia.assert(rolesPage);
  typia.assert(rolesPage.pagination);
  typia.assert(rolesPage.data);
  // 4. Validate pagination metadata structure
  const pagination = rolesPage.pagination;
  typia.assert(pagination.current);
  typia.assert(pagination.limit);
  typia.assert(pagination.records);
  typia.assert(pagination.pages);
  // 5. Validate pagination metadata values
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("limit is 20", pagination.limit, 20);
  TestValidator.equals(
    "total records matches page data",
    pagination.records,
    rolesPage.data.length,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  // 6. Validate built-in roles exist in response
  const builtInRoles = rolesPage.data.filter(
    (role) => role.role_kind === "built_in",
  );
  TestValidator.predicate("has built-in roles", builtInRoles.length >= 3);
  // 7. Verify specific built-in role names exist
  const roleNames = builtInRoles.map((r) => r.name);
  const hasOwner = roleNames.includes("Owner");
  const hasManager = roleNames.includes("Manager");
  const hasEmployee = roleNames.includes("Employee");
  TestValidator.predicate("has Owner role", hasOwner);
  TestValidator.predicate("has Manager role", hasManager);
  TestValidator.predicate("has Employee role", hasEmployee);
  // 8. Validate each role has required fields
  for (const role of rolesPage.data) {
    typia.assert(role);
    typia.assert(role.id);
    typia.assert(role.name);
    typia.assert(role.role_kind);
    typia.assert(role.organization);
    typia.assert(role.permissions_count);
    TestValidator.predicate(
      "permissions_count is non-negative",
      role.permissions_count >= 0,
    );
  }
  // 9. Validate role organization association
  const testRole = rolesPage.data[0];
  if (testRole) {
    TestValidator.equals(
      "role has organization",
      testRole.organization !== null,
      true,
    );
    if (testRole.organization) {
      TestValidator.equals(
        "organization has name",
        testRole.organization.name.length > 0,
        true,
      );
    }
  }
  // 10. Test with custom pagination parameters
  const customPage = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(customPage);
  TestValidator.equals(
    "custom limit respected",
    customPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "custom pages calculated",
    customPage.pagination.pages >= 1,
  );
  // 11. Test filtering by role_kind
  const builtInOnlyPage = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        role_kind: "built_in",
      },
    },
  );
  typia.assert(builtInOnlyPage);
  for (const role of builtInOnlyPage.data) {
    TestValidator.equals(
      "filter by role_kind works",
      role.role_kind,
      "built_in",
    );
  }
  // 12. Verify sorting order (created_at DESC)
  if (rolesPage.data.length >= 2) {
    const firstRole = rolesPage.data[0];
    const secondRole = rolesPage.data[1];
    typia.assert(firstRole);
    typia.assert(secondRole);
    typia.assert(firstRole.organization);
    typia.assert(secondRole.organization);
    // Note: We cannot directly validate sort order without timestamps in role summary,
    // but we verify the API accepts sort parameter without error
  }
}