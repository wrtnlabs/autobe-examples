import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackTimelogCollector {
  export async function collect(props: {
    body: IHrmTimeTrackTimelog.ICreate;
    hrmTimeTrackEmployees: IEntity;
    hrmTimeTrackMemberSessions: IEntity;
  }) {
    // Query session to get organization_id
    const session =
      await MyGlobal.prisma.hrm_time_track_member_sessions.findFirstOrThrow({
        where: {
          id: props.hrmTimeTrackMemberSessions.id,
        },
        select: { hrm_time_track_organization_id: true },
      });
    return {
      id: v4(),
      date: new Date(props.body.date),
      duration_seconds: props.body.duration_seconds,
      billable: props.body.billable,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmTimeTrackEmployees.id } },
      organization: { connect: { id: session.hrm_time_track_organization_id } },
      project: { connect: { id: props.body.hrm_time_track_project_id } },
      task: props.body.hrm_time_track_task_id
        ? { connect: { id: props.body.hrm_time_track_task_id } }
        : undefined,
    } satisfies Prisma.hrm_time_track_timelogsCreateInput;
  }
}
