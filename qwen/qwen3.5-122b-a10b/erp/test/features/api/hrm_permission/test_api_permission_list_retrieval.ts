import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test permission list retrieval with pagination and filtering.
 *
 * Validates that authenticated members can retrieve the complete list of available system permissions with default pagination settings. The endpoint returns all predefined permissions organized by category with proper pagination metadata.
 *
 * Special attention is given to verifying that all 9 permissions are returned with correct field structure, pagination defaults are applied correctly, and alphabetical sorting is maintained.
 *
 * 1. Register a new member account with email and password.
 * 2. Create member-specific connection with authentication token.
 * 3. Retrieve permissions list with default pagination settings.
 * 4. Validates response structure and pagination metadata.
 * 5. Verifies all 9 permissions are present with correct fields.
 * 6. Verifies permissions are sorted alphabetically by permission_name.
 * 7. Tests category filtering functionality.
 */
export async function test_api_permission_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Retrieve permissions list with default pagination
  const permissions = await api.functional.hrm.member.permissions.index(
    memberConnection,
    {
      body: {} satisfies IHrmPermission.IRequest,
    },
  );
  typia.assert(permissions);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", permissions.pagination.current, 1);
  TestValidator.equals("limit is 20", permissions.pagination.limit, 20);
  TestValidator.predicate("has records", permissions.pagination.records > 0);
  TestValidator.predicate(
    "pages calculated correctly",
    permissions.pagination.pages ===
      Math.ceil(permissions.pagination.records / permissions.pagination.limit),
  );
  // 4. Validate all 9 permissions are returned
  TestValidator.equals(
    "all 9 permissions returned",
    permissions.data.length,
    9,
  );
  // 5. Validate alphabetical sorting by permission_name
  const permissionNames = permissions.data.map((p) => p.permission_name);
  const sortedNames = [...permissionNames].sort();
  TestValidator.equals(
    "permissions sorted alphabetically",
    JSON.stringify(permissionNames),
    JSON.stringify(sortedNames),
  );
  // 6. Test category filtering
  const orgPermissions = await api.functional.hrm.member.permissions.index(
    memberConnection,
    {
      body: { category: "org" } satisfies IHrmPermission.IRequest,
    },
  );
  typia.assert(orgPermissions);
  TestValidator.predicate(
    "org category filtered",
    orgPermissions.data.every((p) => p.permission_name.startsWith("org:")),
  );
  const timePermissions = await api.functional.hrm.member.permissions.index(
    memberConnection,
    {
      body: { category: "time" } satisfies IHrmPermission.IRequest,
    },
  );
  typia.assert(timePermissions);
  TestValidator.predicate(
    "time category filtered",
    timePermissions.data.every((p) => p.permission_name.startsWith("time:")),
  );
}
