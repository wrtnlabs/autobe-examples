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
      // Scalar fields
      id,
      email: props.body.email,
      status: "pending",
      token: v4(),
      position: props.body.position ?? null,
      note: props.body.note ?? null,
      accepted_at: null,
      expires_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      organization: { connect: { id: props.erpHrmOrganizations.id } },
      role: props.body.erpHrmRoleId
        ? { connect: { id: props.body.erpHrmRoleId } }
        : undefined,
      department: props.body.erpHrmDepartmentId
        ? { connect: { id: props.body.erpHrmDepartmentId } }
        : undefined,
    } satisfies Prisma.erp_hrm_invitationsCreateInput;
  }
}
