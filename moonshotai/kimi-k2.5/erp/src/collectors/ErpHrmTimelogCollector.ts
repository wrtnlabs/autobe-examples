import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimelogCollector {
  export async function collect(props: {
    body: IErpHrmTimelog.ICreate;
    organizationMember: IEntity;
  }) {
    const id: string = v4();
    const startTime = new Date(props.body.start_time);
    const endTime = new Date(props.body.end_time);
    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000,
    );
    return {
      id,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      billable: props.body.billable ?? false,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organizationMember: { connect: { id: props.organizationMember.id } },
      project: { connect: { id: props.body.project_id } },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
      timesheet: undefined,
    } satisfies Prisma.erp_hrm_timelogsCreateInput;
  }
}
