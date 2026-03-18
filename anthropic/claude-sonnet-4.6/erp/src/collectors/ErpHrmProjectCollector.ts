import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmProjectCollector {
  export async function collect(props: {
    body: IErpHrmProject.ICreate;
    erpHrmOrganizationMembers: IEntity; // from authorized actor
    erpHrmMemberSessions: IEntity; // from authorized session
  }) {
    // Resolve organization_id from the authorized organization member
    const orgMember =
      await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
        where: { id: props.erpHrmOrganizationMembers.id },
        select: { organization_id: true },
      });
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      color: props.body.color,
      status: "active",
      budget_hours: props.body.budget_hours ?? null,
      started_at: props.body.started_at
        ? new Date(props.body.started_at)
        : null,
      ended_at: props.body.ended_at ? new Date(props.body.ended_at) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: orgMember.organization_id } },
    } satisfies Prisma.erp_hrm_projectsCreateInput;
  }
}
