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
    project: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      role: props.body.role,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: { connect: { id: props.project.id } },
      organizationMember: { connect: { id: props.body.organizationMemberId } },
    } satisfies Prisma.erp_hrm_project_membersCreateInput;
  }
}
