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
    erpHrmOrganizationMembers: IEntity;
    erpHrmMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      email: props.body.email,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      organization: { connect: { id: props.erpHrmOrganizations.id } },
      invitingMember: { connect: { id: props.erpHrmOrganizationMembers.id } },
      member: undefined,
    } satisfies Prisma.erp_hrm_invitationsCreateInput;
  }
}
