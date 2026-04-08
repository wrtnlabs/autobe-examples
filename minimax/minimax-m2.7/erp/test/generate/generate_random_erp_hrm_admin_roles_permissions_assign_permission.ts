import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_role_permission } from "../prepare/prepare_random_erp_hrm_role_permission";

export async function generate_random_erp_hrm_admin_roles_permissions_assign_permission(
  connection: IConnection,
  props: {
    body?: DeepPartial<IErpHrmRolePermission.ICreate>;
    params: {
      roleId: string;
    };
  },
): Promise<IErpHrmRolePermission> {
  const prepared: IErpHrmRolePermission.ICreate =
    prepare_random_erp_hrm_role_permission(props.body);
  const result: IErpHrmRolePermission =
    await api.functional.erpHrm.admin.roles.permissions.assignPermission(
      connection,
      {
        roleId: props.params.roleId,
        body: prepared,
      },
    );
  return result;
}
