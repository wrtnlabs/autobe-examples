import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { IHrmTrackerTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerTaskHistoryTransformer } from "../transformers/HrmTrackerTaskHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTrackerMemberProjectsProjectIdTasksTaskIdTaskHistoriesTaskHistoryId(props: {
  member: MemberPayload;
  projectId: string;
  taskId: string;
  taskHistoryId: string;
}): Promise<IHrmTrackerTaskHistory> {
  const history =
    await MyGlobal.prisma.hrm_tracker_task_histories.findUniqueOrThrow({
      where: { id: props.taskHistoryId },
      ...HrmTrackerTaskHistoryTransformer.select(),
    });
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirstOrThrow(
    {
      where: { user_id: props.member.id },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
      },
    },
  );
  const hasManagePermission =
    employee.role_id !== null
      ? await MyGlobal.prisma.hrm_tracker_roles
          .findFirstOrThrow({
            where: { id: employee.role_id },
            select: {
              permissions: {
                select: { permission: true },
              },
            },
          })
          .then((role) =>
            role.permissions.some((p) => p.permission === "project:manage"),
          )
      : false;
  if (!hasManagePermission) {
    await MyGlobal.prisma.hrm_tracker_project_members.findFirstOrThrow({
      where: {
        project: { id: props.projectId },
        employee: { id: employee.id },
        deleted_at: null,
      },
      select: { id: true },
    });
  }
  return await HrmTrackerTaskHistoryTransformer.transform(history);
}
