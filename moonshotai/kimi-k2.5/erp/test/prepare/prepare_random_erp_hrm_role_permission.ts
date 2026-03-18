import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_role_permission(
  input?: DeepPartial<IErpHrmRolePermission.ICreate> | undefined,
): IErpHrmRolePermission.ICreate {
  return {
    permission:
      input?.permission ??
      `${RandomGenerator.alphabets(8)}.${RandomGenerator.alphabets(4)}`,
  };
}
