import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_role } from "../prepare/prepare_random_erp_hrm_role";

export async function generate_random_erp_hrm_member_organizations_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmRole.ICreate> | undefined;
    params: {
      organizationId: string;
    };
  },
): Promise<IErpHrmRole> {
  const prepared: IErpHrmRole.ICreate = prepare_random_erp_hrm_role(props.body);
  return await api.functional.erpHrm.member.organizations.roles.create(
    connection,
    {
      body: prepared,
      organizationId: props.params.organizationId,
    },
  );
}
