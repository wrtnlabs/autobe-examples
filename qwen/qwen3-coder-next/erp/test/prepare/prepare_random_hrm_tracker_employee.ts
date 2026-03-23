import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_tracker_employee(
  input?: DeepPartial<IHrmTrackerEmployee.ICreate> | undefined,
): IHrmTrackerEmployee.ICreate {
  return {
    employment_type:
      input?.employment_type ??
      RandomGenerator.pick([
        "full-time",
        "part-time",
        "contractor",
        "intern",
      ] as const),
    status:
      input?.status ?? RandomGenerator.pick(["active", "deactivated"] as const),
    position: input?.position ?? RandomGenerator.paragraph({ sentences: 1 }),
    department_id:
      input?.department_id ??
      (Math.random() > 0.3
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
    role_id:
      input?.role_id ??
      (Math.random() > 0.3
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
    organization_id:
      input?.organization_id ?? typia.random<string & tags.Format<"uuid">>(),
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
