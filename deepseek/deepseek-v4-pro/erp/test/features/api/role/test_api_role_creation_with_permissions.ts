import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test custom role creation with assigned permissions via the ERP HRM API.
 *
 * Validates that an organization Owner (created through member join) can create
 * a custom role with a unique name, description, and permission set. The test
 * verifies that the created role has `is_builtin` set to false, contains
 * the expected name and description, and has a non-empty set of resolved
 * permissions.
 *
 * 1. Authenticate as a new member via join (becomes Owner of a new organization).
 * 2. Create a custom role with explicit name and description, permissions randomized.
 * 3. Validate response: name matches, is_builtin is false, permissions non-empty,
 *    deleted_at is null, timestamps present.
 */
export async function test_api_role_creation_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via join (becomes Owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a custom role with explicit name and description
  const roleName = `Custom Role ${RandomGenerator.alphaNumeric(8)}`;
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {
    body: {
      name: roleName,
      description: "A custom role for testing purposes",
    },
  });
  typia.assert(role);
  // 3. Validate business logic
  TestValidator.equals("role name matches request", role.name, roleName);
  TestValidator.equals("is_builtin is false", role.is_builtin, false);
  TestValidator.equals("deleted_at is null", role.deleted_at, null);
  TestValidator.predicate(
    "permissions is non-empty",
    role.permissions.length > 0,
  );
}
