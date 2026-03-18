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
    erpHrmOrganizationMembers: IEntity; // from authorized actor
    erpHrmMemberSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      work_date: new Date(props.body.work_date),
      duration_minutes: props.body.duration_minutes,
      billable: props.body.billable ?? false,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo: organizationMember (required)
      organizationMember: {
        connect: { id: props.erpHrmOrganizationMembers.id },
      },
      // BelongsTo: project (required, from body)
      project: {
        connect: { id: props.body.project_id },
      },
      // BelongsTo: task (optional, from body)
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
      // BelongsTo: timesheet (optional — not linked on creation)
      timesheet: undefined,
    } satisfies Prisma.erp_hrm_timelogsCreateInput;
  }
}
