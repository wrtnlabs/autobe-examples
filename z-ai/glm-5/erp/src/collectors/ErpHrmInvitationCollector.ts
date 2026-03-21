import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmInvitationCollector {
  export async function collect(props: {
    body: IErpHrmInvitation.ICreate;
    erpHrmOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      email: props.body.email,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.erpHrmOrganizations.id } },
      role: { connect: { id: props.body.roleId } },
    } satisfies Prisma.erp_hrm_invitationsCreateInput;
  }
}
