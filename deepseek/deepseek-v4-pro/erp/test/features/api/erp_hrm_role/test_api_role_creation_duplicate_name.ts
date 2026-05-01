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
 * Test that creating a role with a duplicate name within the same organization is rejected.
 *
 * Validates the organization-level uniqueness constraint on role names enforced by the composite unique index on (erp_hrm_organization_id, name). The test first creates a custom role with a specific name, confirming it succeeds and the name is persisted. It then attempts to create a second custom role with the identical name — the API must reject this with HTTP 409 Conflict, indicating the name is already in use within the organization.
 *
 * 1. A new member joins via the auth/member/join endpoint, which creates a new organization and assigns the member the Owner role, granting full role management permissions.
 * 2. A custom role is created with a deterministic name and a valid permission set — the API returns 201 with the complete role including the matching name.
 * 3. A second role creation is attempted with the exact same name — expects HTTP 409 Conflict, confirming the uniqueness constraint is enforced regardless of the permission set provided.
 */
export async function test_api_role_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via join (becomes Owner of a new organization)
  const ownerConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(ownerConnection, {});
  typia.assert(member);
  // 2. Generate a deterministic role name for duplicate testing
  const roleName = RandomGenerator.paragraph({ sentences: 3 });
  // 3. Create the first role — succeeds and establishes the name
  const firstRole = await generate_random_erp_hrm_roles_create(
    ownerConnection,
    { body: { name: roleName } },
  );
  typia.assert(firstRole);
  TestValidator.equals("role name matches input", firstRole.name, roleName);
  // 4. Attempt duplicate name creation — must be rejected with 409 Conflict
  await TestValidator.httpError("duplicate role name", 409, async () => {
    await generate_random_erp_hrm_roles_create(ownerConnection, {
      body: { name: roleName },
    });
  });
}
