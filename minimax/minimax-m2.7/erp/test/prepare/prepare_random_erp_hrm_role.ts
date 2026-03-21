import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

const VALID_PERMISSION_CODES = [
  "org:manage",
  "employee:manage",
  "project:manage",
  "project:view",
  "time:approve",
  "time:manage",
  "time:view_all",
  "report:view",
];
export function prepare_random_erp_hrm_role(
  input?: DeepPartial<IErpHrmRole.ICreate>,
): IErpHrmRole.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    permissions: input?.permissions
      ? input.permissions.map((p) => p)
      : RandomGenerator.sample(
          VALID_PERMISSION_CODES,
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<4>
          >(),
        ),
  };
}