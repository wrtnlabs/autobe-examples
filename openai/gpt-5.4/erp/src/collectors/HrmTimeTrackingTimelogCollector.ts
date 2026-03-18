import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingTimelogCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingTimelog.ICreate;
    hrmTimeTrackingOrganizations: IEntity;
    hrmTimeTrackingEmployees: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      worked_on: new Date(props.body.workedOn),
      duration_minutes: props.body.durationMinutes,
      description: props.body.description ?? null,
      billable: props.body.billable,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: {
        connect: { id: props.hrmTimeTrackingOrganizations.id },
      },
      employee: {
        connect: { id: props.hrmTimeTrackingEmployees.id },
      },
      project: {
        connect: { id: props.body.hrmTimeTrackingProjectId },
      },
      task: props.body.hrmTimeTrackingTaskId
        ? {
            connect: { id: props.body.hrmTimeTrackingTaskId },
          }
        : undefined,
    } satisfies Prisma.hrm_time_tracking_timelogsCreateInput;
  }
}
