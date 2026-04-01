import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_role_permission } from "../prepare/prepare_random_erp_hrm_time_role_permission";

export async function generate_random_erp_hrm_time_member_roles_permissions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeRolePermission.ICreate> | undefined;
    params: {
      roleId: string;
    };
  },
): Promise<IErpHrmTimeRolePermission> {
  const prepared: IErpHrmTimeRolePermission.ICreate =
    prepare_random_erp_hrm_time_role_permission(props.body);
  return await api.functional.erpHrmTime.member.roles.permissions.create(
    connection,
    {
      body: prepared,
      roleId: props.params.roleId,
    },
  );
}
