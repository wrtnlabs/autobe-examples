import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_employee(
  input?: DeepPartial<IHrmPlatformEmployee.ICreate>,
): IHrmPlatformEmployee.ICreate {
  return {
    member_id: input?.member_id ?? typia.random<string & tags.Format<"uuid">>(),
    role_id: input?.role_id ?? typia.random<string & tags.Format<"uuid">>(),
    department_id:
      input?.department_id !== undefined
        ? (input.department_id ?? null)
        : typia.random<boolean>()
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
    position:
      input?.position !== undefined
        ? (input.position ?? null)
        : typia.random<boolean>()
          ? RandomGenerator.name(2)
          : null,
    employment_type:
      input?.employment_type ??
      RandomGenerator.pick([
        "full-time",
        "part-time",
        "contractor",
        "intern",
      ] as const),
    status:
      input?.status ??
      RandomGenerator.pick([
        "active",
        "active",
        "active",
        "deactivated",
      ] as const),
  };
}
