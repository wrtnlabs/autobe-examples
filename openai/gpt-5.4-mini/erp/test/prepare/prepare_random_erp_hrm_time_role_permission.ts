import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_role_permission(
  input?: DeepPartial<IErpHrmTimeRolePermission.ICreate> | undefined,
): IErpHrmTimeRolePermission.ICreate {
  return {
    erpHrmTimePermissionId:
      input?.erpHrmTimePermissionId ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
