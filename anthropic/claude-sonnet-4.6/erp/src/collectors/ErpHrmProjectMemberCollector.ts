import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmProjectMemberCollector {
  export async function collect(props: {
    body: IErpHrmProjectMember.ICreate;
    erpHrmProjects: IEntity;
    erpHrmMembers: IEntity;
    erpHrmMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      project_role: props.body.projectRole,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: { connect: { id: props.erpHrmProjects.id } },
      organizationMember: { connect: { id: props.body.organizationMemberId } },
    } satisfies Prisma.erp_hrm_project_membersCreateInput;
  }
}
