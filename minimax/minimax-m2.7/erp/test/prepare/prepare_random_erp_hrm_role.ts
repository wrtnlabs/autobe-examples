import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

const PERMISSION_CODES = [
  "org:manage",
  "employee:manage",
  "employee:view",
  "project:manage",
  "project:view",
  "time:manage",
  "time:approve",
  "time:view_all",
  "report:view",
] as const;
export function prepare_random_erp_hrm_role(
  input?: DeepPartial<IErpHrmRole.ICreate>,
): IErpHrmRole.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    permissions:
      input?.permissions ?? RandomGenerator.sample([...PERMISSION_CODES], 3),
  };
}