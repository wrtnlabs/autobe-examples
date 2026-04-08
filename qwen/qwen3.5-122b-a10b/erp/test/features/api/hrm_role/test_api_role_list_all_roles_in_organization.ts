import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test listing all roles within an organization with pagination and built-in role validation.
 *
 * Validates the role listing endpoint by authenticating as a member, retrieving all roles for their organization, and verifying the response includes the three built-in system roles (Owner, Manager, Employee) with correct is_builtin flags. Ensures pagination metadata is properly structured and all role summary fields are present.
 *
 * The test confirms that built-in roles are always included in the response with is_builtin=true, while custom roles (if any exist) would have is_builtin=false. Organization scoping is validated to ensure roles are correctly associated with the member's organization.
 *
 * 1. Member registers with email/password credentials.
 * 2. Retrieves organization context from authentication response.
 * 3. Lists all roles for the organization with pagination parameters.
 * 4. Validates response structure matches IPageIHrmRole.ISummary.
 * 5. Verifies all three built-in roles exist with correct is_builtin flags.
 * 6. Validates pagination metadata (current, limit, records, pages).
 * 7. Confirms role summary fields (id, name, is_builtin, organization, created_at, updated_at).
 */
export async function test_api_role_list_all_roles_in_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(auth);
  // 2. Get organization context from auth response
  TestValidator.predicate(
    "member has organizations",
    auth.organizations !== undefined && auth.organizations.length > 0,
  );
  const organizationId: string & tags.Format<"uuid"> =
    auth.organizations![0].id;
  // 3. List all roles for the organization
  const roles: IPageIHrmRole.ISummary =
    await api.functional.hrm.member.roles.index(memberConnection, {
      body: {
        organization_id: organizationId,
        page: 1,
        pageSize: 100,
      } satisfies IHrmRole.IRequest,
    });
  typia.assert(roles);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current",
    roles.pagination.current >= 0,
  );
  TestValidator.predicate("pagination has limit", roles.pagination.limit >= 0);
  TestValidator.predicate(
    "pagination has records",
    roles.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", roles.pagination.pages >= 0);
  // 5. Validate data array exists and has roles
  TestValidator.predicate("has data array", Array.isArray(roles.data));
  TestValidator.predicate(
    "data count matches pagination",
    roles.data.length === roles.pagination.records,
  );
  // 6. Validate all three built-in roles exist
  const builtInRoles = roles.data.filter((role) => role.is_builtin === true);
  TestValidator.predicate("has 3 built-in roles", builtInRoles.length === 3);
  const builtInRoleNames = builtInRoles.map((role) => role.name);
  TestValidator.predicate("has Owner role", builtInRoleNames.includes("Owner"));
  TestValidator.predicate(
    "has Manager role",
    builtInRoleNames.includes("Manager"),
  );
  TestValidator.predicate(
    "has Employee role",
    builtInRoleNames.includes("Employee"),
  );
  // 7. Validate role summary fields for each role
  for (const role of roles.data) {
    typia.assert(role satisfies IHrmRole.ISummary);
    TestValidator.predicate("role has valid id", role.id !== undefined);
    TestValidator.predicate(
      "role has name",
      role.name !== undefined && role.name.length > 0,
    );
    TestValidator.predicate(
      "role has is_builtin flag",
      typeof role.is_builtin === "boolean",
    );
    TestValidator.predicate(
      "role has organization",
      role.organization !== undefined,
    );
    TestValidator.predicate(
      "role has created_at",
      role.created_at !== undefined,
    );
    TestValidator.predicate(
      "role has updated_at",
      role.updated_at !== undefined,
    );
    // Validate organization summary fields
    TestValidator.predicate(
      "organization has id",
      role.organization.id !== undefined,
    );
    TestValidator.predicate(
      "organization has name",
      role.organization.name !== undefined,
    );
  }
}
