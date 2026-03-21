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
    position: input?.position ?? RandomGenerator.name(1),
    note: input?.note ?? RandomGenerator.paragraph({ sentences: 2 }),
    erpHrmRoleId:
      input?.erpHrmRoleId ?? typia.random<string & tags.Format<"uuid">>(),
    erpHrmDepartmentId:
      input?.erpHrmDepartmentId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
