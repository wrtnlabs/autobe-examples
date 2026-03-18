import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingProjectMembershipCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingProjectMembership.ICreate;
    project: IEntity;
  }) {
    return {
      id: v4(),
      membership_role: props.body.membership_role,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: {
        connect: {
          id: props.project.id,
        },
      },
      employee: {
        connect: {
          id: props.body.employee_id,
        },
      },
    } satisfies Prisma.hrm_time_tracking_project_membershipsCreateInput;
  }
}
