import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_invitation(
  input?: DeepPartial<IErpHrmInvitation.ICreate> | undefined,
): IErpHrmInvitation.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    roleId: input?.roleId ?? typia.random<string & tags.Format<"uuid">>(),
    employmentType:
      input?.employmentType ??
      RandomGenerator.pick([
        "full-time",
        "part-time",
        "contractor",
        "intern",
      ] as const),
  };
}
