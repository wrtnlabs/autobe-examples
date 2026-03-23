import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTrackerTimelogCollector {
  export async function collect(props: {
    body: IHrmTrackerTimelog.ICreate;
    hrmTrackerEmployees: IEntity;
    hrmTrackerOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      date: new Date(props.body.date),
      duration_in_minutes: props.body.duration_in_minutes,
      description: props.body.description ?? null,
      billable: props.body.billable ?? true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmTrackerOrganizations.id } },
      employee: { connect: { id: props.hrmTrackerEmployees.id } },
      project: { connect: { id: props.body.project_id } },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
    } satisfies Prisma.hrm_tracker_timelogsCreateInput;
  }
}
