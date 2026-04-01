import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeProjectMembershipCollector {
  export async function collect(props: {
    body: IErpHrmTimeProjectMembership.ICreate;
    project: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      project_role: props.body.projectRole,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: { connect: { id: props.project.id } },
      employee: { connect: { id: props.body.employeeId } },
    } satisfies Prisma.erp_hrm_time_project_membershipsCreateInput;
  }
}
