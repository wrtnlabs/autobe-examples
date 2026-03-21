import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test that creating a role with a name that already exists in the same
 * organization is rejected with a conflict error.
 *
 * This validates that role names must be unique within the organization scope,
 * preventing duplicate role names that could cause confusion in role assignment.
 */
export async function test_api_role_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member with org:manage permission
  // When a member joins, they become the owner of their organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a custom role with a unique name
  const firstRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {},
  );
  typia.assert(firstRole);
  // Step 3: Attempt to create a second role with the same name
  // This should fail with 409 Conflict
  const duplicateRequestBody = {
    name: firstRole.name,
    permissions: ["employee:view", "time:view_all"] as const,
  } satisfies IErpHrmRole.ICreate;
  await TestValidator.httpError(
    "duplicate role name should be rejected",
    409,
    async () => {
      await api.functional.erpHrm.member.roles.create(memberConnection, {
        body: duplicateRequestBody,
      });
    },
  );
}
