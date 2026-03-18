import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_role_permission } from "../prepare/prepare_random_erp_hrm_role_permission";

export async function generate_random_erp_hrm_member_organizations_roles_permissions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmRolePermission.ICreate> | undefined;
    params: {
      organizationId: string;
      roleId: string;
    };
  },
): Promise<IErpHrmRolePermission> {
  const prepared: IErpHrmRolePermission.ICreate =
    prepare_random_erp_hrm_role_permission(props.body);
  return await api.functional.erpHrm.member.organizations.roles.permissions.create(
    connection,
    {
      body: prepared,
      organizationId: props.params.organizationId,
      roleId: props.params.roleId,
    },
  );
}
