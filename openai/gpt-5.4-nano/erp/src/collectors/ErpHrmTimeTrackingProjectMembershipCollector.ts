import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingProjectMembershipCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingProjectMembership.ICreate;
    project: IEntity;
    employee: IEntity;
  }) {
    const id = v4();
    const now = new Date();
    return {
      id,
      membership_role: props.body.membership_role,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      project: {
        connect: {
          id: props.project.id,
        },
      },
      employee: {
        connect: {
          id: props.employee.id,
        },
      },
    } satisfies Prisma.erp_hrm_time_tracking_project_membershipsCreateInput;
  }
}
