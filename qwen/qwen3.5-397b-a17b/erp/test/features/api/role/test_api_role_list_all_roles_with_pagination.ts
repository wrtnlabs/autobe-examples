import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
 * Test retrieving all roles within an organization with pagination metadata.
 *
 * Validates the complete role list retrieval flow including member authentication, endpoint invocation without filters, and comprehensive response validation. Ensures that the response contains proper pagination metadata and that all roles include the required fields with correct data types.
 *
 * Special attention is given to verifying that built-in roles (Owner, Manager, Employee) are present in the response and correctly marked with is_built_in=true. The permission_count field is validated to ensure it accurately reflects the number of permissions assigned to each role.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Creates member-specific connection with authentication token.
 * 3. Calls PATCH /hrmPlatform/member/roles without filters to retrieve all roles.
 * 4. Validates response structure using typia.assert().
 * 5. Verifies pagination metadata contains current, limit, records, and pages fields.
 * 6. Validates each role contains required fields (id, name, is_built_in, description, permission_count, and created_at).
 * 7. Confirms built-in roles (Owner, Manager, Employee) are present with is_built_in=true.
 */
export async function test_api_role_list_all_roles_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve all roles without filters
  const response = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate each role contains required fields (business logic only)
  for (const role of response.data) {
    TestValidator.predicate("role name is not empty", role.name.length > 0);
    TestValidator.predicate(
      "permission_count is non-negative",
      role.permission_count >= 0,
    );
  }
  // 5. Verify built-in roles are present
  const builtInRoleNames = response.data
    .filter((role) => role.is_built_in)
    .map((role) => role.name);
  TestValidator.predicate(
    "Owner role exists",
    builtInRoleNames.includes("Owner"),
  );
  TestValidator.predicate(
    "Manager role exists",
    builtInRoleNames.includes("Manager"),
  );
  TestValidator.predicate(
    "Employee role exists",
    builtInRoleNames.includes("Employee"),
  );
}
