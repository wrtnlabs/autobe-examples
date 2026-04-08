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
 * Test retrieving a paginated list of all roles within an organization.
 *
 * Validates the role listing endpoint returns both built-in and custom roles with proper pagination metadata. Ensures that the response includes the three built-in roles (Owner, Manager, Employee) and validates the structure of role summaries including pagination information.
 *
 * The test verifies that role summaries contain all required fields while excluding permission details, and that pagination metadata accurately reflects the query parameters and result set.
 *
 * 1. Register a new member account with email and password.
 * 2. Extract organization ID from the member's organizations list.
 * 3. Retrieve all roles with default pagination parameters.
 * 4. Validate response structure and pagination metadata.
 * 5. Verify built-in roles are present with correct is_builtin flags.
 * 6. Test pagination with custom page size and verify metadata accuracy.
 */
export async function test_api_role_list_retrieve_all_roles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Extract organization ID from member's organizations
  TestValidator.predicate(
    "member has organizations",
    memberAuth.organizations !== undefined &&
      memberAuth.organizations.length > 0,
  );
  const organizationId = memberAuth.organizations![0].id;
  // 3. Retrieve all roles with default pagination
  const rolesResponse =
    await api.functional.hrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId,
        body: {
          organization_id: organizationId,
          page: 1,
          pageSize: 100,
        } satisfies IHrmRole.IRequest,
      },
    );
  typia.assert(rolesResponse);
  // 4. Validate response structure
  TestValidator.equals(
    "has pagination",
    rolesResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    rolesResponse.data !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination current is positive",
    rolesResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    rolesResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    rolesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    rolesResponse.pagination.pages >= 0,
  );
  // 5. Validate data array
  TestValidator.predicate(
    "data array is not empty",
    rolesResponse.data.length > 0,
  );
  TestValidator.equals(
    "records matches data length",
    rolesResponse.pagination.records,
    rolesResponse.data.length,
  );
  // 6. Verify built-in roles are present
  const builtInRoles = rolesResponse.data.filter(
    (role) => role.is_builtin === true,
  );
  const customRoles = rolesResponse.data.filter(
    (role) => role.is_builtin === false,
  );
  TestValidator.predicate("has built-in roles", builtInRoles.length >= 3);
  TestValidator.predicate(
    "has owner role",
    builtInRoles.some((role) => role.name === "Owner"),
  );
  TestValidator.predicate(
    "has manager role",
    builtInRoles.some((role) => role.name === "Manager"),
  );
  TestValidator.predicate(
    "has employee role",
    builtInRoles.some((role) => role.name === "Employee"),
  );
  // 7. Validate role summary structure
  await ArrayUtil.asyncForEach(rolesResponse.data, async (role) => {
    // Validate required fields
    TestValidator.predicate("role has id", role.id !== undefined);
    TestValidator.predicate("role has name", role.name !== undefined);
    TestValidator.predicate(
      "role has is_builtin flag",
      role.is_builtin !== undefined,
    );
    TestValidator.predicate(
      "role has organization reference",
      role.organization !== undefined,
    );
    TestValidator.predicate(
      "role has created_at timestamp",
      role.created_at !== undefined,
    );
    TestValidator.predicate(
      "role has updated_at timestamp",
      role.updated_at !== undefined,
    );
    // Validate organization reference matches queried organization
    TestValidator.equals(
      "organization ID matches",
      role.organization.id,
      organizationId,
    );
    // Validate timestamps are valid ISO 8601 format
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(Date.parse(role.created_at)),
    );
    TestValidator.predicate(
      "updated_at is valid date-time",
      !isNaN(Date.parse(role.updated_at)),
    );
    // Validate UUID format for id
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    TestValidator.predicate("id is valid UUID", uuidRegex.test(role.id));
  });
  // 8. Test pagination with custom page size
  const paginatedResponse =
    await api.functional.hrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId,
        body: {
          organization_id: organizationId,
          page: 1,
          pageSize: 5,
        } satisfies IHrmRole.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // 9. Validate pagination metadata accuracy
  TestValidator.equals(
    "current page is 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    paginatedResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length matches limit or less",
    paginatedResponse.data.length <= 5,
  );
  TestValidator.predicate(
    "data length is at least 1",
    paginatedResponse.data.length >= 1,
  );
  TestValidator.predicate(
    "pages is calculated correctly",
    paginatedResponse.pagination.pages >= 1,
  );
}
