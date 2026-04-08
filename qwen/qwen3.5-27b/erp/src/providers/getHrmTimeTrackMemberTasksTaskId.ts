import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTaskTransformer } from "../transformers/HrmTimeTrackTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackTask> {
  // Verify the task exists and is not soft-deleted
  const task = await MyGlobal.prisma.hrm_time_track_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_track_project_id: true,
    },
  });
  // Check if the member has access to the project through their employee record
  const projectMember =
    await MyGlobal.prisma.hrm_time_track_project_members.findFirst({
      where: {
        hrm_time_track_project_id: task.hrm_time_track_project_id,
        hrm_time_track_employee_id: props.member.id,
      },
    });
  if (!projectMember) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch the complete task with all related data using the transformer
  const record = await MyGlobal.prisma.hrm_time_track_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    ...HrmTimeTrackTaskTransformer.select(),
  });
  return await HrmTimeTrackTaskTransformer.transform(record);
}
