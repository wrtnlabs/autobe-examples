import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_department(
  input?: DeepPartial<IErpHrmDepartment.ICreate>,
): IErpHrmDepartment.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 1 }),
    description:
      input?.description ??
      (Math.random() > 0.5 ? RandomGenerator.content({ paragraphs: 1 }) : null),
    parentId:
      input?.parentId ??
      (Math.random() > 0.7
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
  };
}
