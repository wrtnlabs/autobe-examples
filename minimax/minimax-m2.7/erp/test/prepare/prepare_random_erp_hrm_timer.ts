import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_timer(
  input?: DeepPartial<IErpHrmTimer.ICreate>,
): IErpHrmTimer.ICreate {
  return {
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 1 }),
    erpHrmProjectId:
      input?.erpHrmProjectId ?? typia.random<string & tags.Format<"uuid">>(),
    erpHrmTaskId:
      input?.erpHrmTaskId ??
      (Math.random() > 0.5
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
  };
}
