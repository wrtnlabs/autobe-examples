import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTaskAtSummaryTransformer } from "../transformers/HrmTimeTrackTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberTasks(props: {
  member: MemberPayload;
  body: IHrmTimeTrackTask.IRequest;
}): Promise<IPageIHrmTimeTrackTask.ISummary> {
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { hrm_time_track_organization_id: true },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    project: {
      hrm_time_track_organization_id: session.hrm_time_track_organization_id,
      deleted_at: null,
      projectMembers: {
        some: {
          hrm_time_track_employee_id: props.member.id,
          deleted_at: null,
        },
      },
    },
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    ...(props.body.employee_id !== undefined &&
      props.body.employee_id !== null && {
        hrm_time_track_employee_id: props.body.employee_id,
      }),
    ...(props.body.project_id !== undefined && {
      hrm_time_track_project_id: props.body.project_id,
    }),
    ...(props.body.parent_task_id !== undefined &&
      props.body.parent_task_id !== null && {
        parent_task_id: props.body.parent_task_id,
      }),
  } satisfies Prisma.hrm_time_track_tasksWhereInput;
  const orderByInput = (
    props.body.sort_by === "priority"
      ? { priority: props.body.sort_direction === "asc" ? "asc" : "desc" }
      : props.body.sort_by === "title"
        ? { title: props.body.sort_direction === "asc" ? "asc" : "desc" }
        : { created_at: "desc" }
  ) satisfies Prisma.hrm_time_track_tasksOrderByWithRelationInput;
  const records = await MyGlobal.prisma.hrm_time_track_tasks.findMany({
    ...HrmTimeTrackTaskAtSummaryTransformer.select(),
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
  });
  const total = await MyGlobal.prisma.hrm_time_track_tasks.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await HrmTimeTrackTaskAtSummaryTransformer.transformAll(records),
  };
}
