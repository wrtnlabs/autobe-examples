import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_role(
  input?: DeepPartial<IErpHrmRole.ICreate> | undefined,
): IErpHrmRole.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    permissions:
      input?.permissions ??
      RandomGenerator.sample(
        [
          "org:manage",
          "employee:manage",
          "employee:view",
          "project:manage",
          "project:view",
          "time:manage",
          "time:approve",
          "time:view_all",
          "report:view",
        ],
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9>
        >(),
      ),
  };
}
