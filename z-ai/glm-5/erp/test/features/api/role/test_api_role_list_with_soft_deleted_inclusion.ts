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
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_list_with_soft_deleted_inclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a custom role
  const customRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        permissions: ["employee:view", "time:view_all"],
      },
    },
  );
  typia.assert(customRole);
  // 3. Verify the new role appears in the roles list
  const rolesBeforeDelete = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(rolesBeforeDelete);
  TestValidator.predicate(
    "custom role appears in list before delete",
    rolesBeforeDelete.data.some((r) => r.id === customRole.id),
  );
  // 4. Delete the custom role
  await api.functional.erpHrm.member.roles.erase(memberConnection, {
    roleId: customRole.id,
  });
  // 5. Call roles list without includeDeleted parameter (defaults to false)
  //    Verify the deleted role is not included
  const rolesDefaultDeleted = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(rolesDefaultDeleted);
  TestValidator.predicate(
    "deleted role not in list by default",
    rolesDefaultDeleted.data.every((r) => r.id !== customRole.id),
  );
  // 6. Call roles list with includeDeleted=false explicitly
  //    Verify the deleted role is not included
  const rolesExcludeDeleted = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        includeDeleted: false,
      },
    },
  );
  typia.assert(rolesExcludeDeleted);
  TestValidator.predicate(
    "deleted role not in list with includeDeleted=false",
    rolesExcludeDeleted.data.every((r) => r.id !== customRole.id),
  );
  // 7. Call roles list with includeDeleted=true
  //    Verify deleted custom roles are included
  const rolesIncludeDeleted = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        includeDeleted: true,
      },
    },
  );
  typia.assert(rolesIncludeDeleted);
  TestValidator.predicate(
    "deleted role included with includeDeleted=true",
    rolesIncludeDeleted.data.some((r) => r.id === customRole.id),
  );
  // 8. Verify built-in roles are always included regardless of includeDeleted setting
  TestValidator.predicate(
    "built-in roles always present",
    rolesDefaultDeleted.data.some((r) => r.isBuiltin === true),
  );
  TestValidator.predicate(
    "built-in roles present with includeDeleted=false",
    rolesExcludeDeleted.data.some((r) => r.isBuiltin === true),
  );
  TestValidator.predicate(
    "built-in roles present with includeDeleted=true",
    rolesIncludeDeleted.data.some((r) => r.isBuiltin === true),
  );
}
