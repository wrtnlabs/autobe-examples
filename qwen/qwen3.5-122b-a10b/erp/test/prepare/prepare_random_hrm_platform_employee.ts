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
    hrm_platform_user_id:
      input?.hrm_platform_user_id ??
      typia.random<string & tags.Format<"uuid">>(),
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    hrm_platform_role_id:
      input?.hrm_platform_role_id ??
      typia.random<string & tags.Format<"uuid">>(),
    hrm_platform_department_id:
      input?.hrm_platform_department_id ??
      typia.random<string & tags.Format<"uuid">>(),
    position: input?.position ?? RandomGenerator.paragraph({ sentences: 2 }),
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
  };
}
