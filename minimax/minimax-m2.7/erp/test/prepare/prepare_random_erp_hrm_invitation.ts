import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_invitation(
  input?: DeepPartial<IErpHrmInvitation.ICreate>,
): IErpHrmInvitation.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    roleId:
      input?.roleId === undefined
        ? null
        : (input.roleId ?? typia.random<string & tags.Format<"uuid">>()),
    departmentId:
      input?.departmentId === undefined
        ? null
        : (input.departmentId ?? typia.random<string & tags.Format<"uuid">>()),
    position:
      input?.position === undefined
        ? null
        : (input.position ?? RandomGenerator.name(1)),
    note:
      input?.note === undefined
        ? null
        : (input.note ?? RandomGenerator.paragraph({ sentences: 2 })),
  };
}
