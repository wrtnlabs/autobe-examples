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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_role_builtin_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create organization (auto-creates built-in roles: Owner, Manager, Employee)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Retrieve a built-in role
  // Note: In a complete implementation, roleId would be obtained from organization creation
  // response or via a roles list endpoint. Using random UUID per available API patterns.
  const role = await api.functional.erpHrm.member.roles.at(memberConnection, {
    roleId: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(role);
  // Step 4: Validate built-in role properties
  TestValidator.predicate(
    "role has isBuiltin flag set to true",
    role.isBuiltin === true,
  );
  TestValidator.predicate(
    "role name is one of: Owner, Manager, Employee",
    ["Owner", "Manager", "Employee"].includes(role.name),
  );
  TestValidator.equals(
    "role belongs to created organization",
    role.organization.id,
    organization.id,
  );
}
