import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerTransformer } from "../transformers/ErpHrmTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IErpHrmTimer.IUpdate;
}): Promise<IErpHrmTimer> {
  // 1. Retrieve the timer by timerId
  const timer = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      erp_hrm_project_id: true,
      erp_hrm_task_id: true,
      started_at: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 2. Find the employee's record linked to the authenticated member
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  // 3. Validate that the authenticated member's employee matches the timer owner
  if (timer.erp_hrm_employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Validate employee is not deactivated
  if (employee.status === "deactivated") {
    throw new HttpException("Employee is deactivated", 403);
  }
  // Determine target project ID (use new projectId if provided, otherwise keep current)
  const targetProjectId = props.body.projectId ?? timer.erp_hrm_project_id;
  // 5. Validate projectId if provided - employee must be a member of the project
  if (props.body.projectId) {
    const projectMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_employee_id: employee.id,
          erp_hrm_project_id: props.body.projectId,
        },
        select: { id: true },
      });
    if (!projectMembership) {
      throw new HttpException(
        "You are not a member of the specified project",
        403,
      );
    }
  }
  // 6. Validate taskId if provided - task must belong to the target project
  let targetTaskId = props.body.taskId;
  if (props.body.taskId !== undefined) {
    // If taskId is explicitly set to null, clear the task
    if (props.body.taskId === null) {
      targetTaskId = null;
    } else {
      // Verify the task belongs to the target project
      const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
        where: {
          id: props.body.taskId,
          erp_hrm_project_id: targetProjectId,
        },
        select: { id: true },
      });
      if (!task) {
        throw new HttpException(
          "Task does not belong to the specified project",
          400,
        );
      }
    }
  }
  // 7. If projectId changed, clear taskId if it doesn't belong to new project
  if (
    props.body.projectId &&
    props.body.projectId !== timer.erp_hrm_project_id
  ) {
    if (timer.erp_hrm_task_id) {
      // Check if current task belongs to new project
      const currentTask = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
        where: {
          id: timer.erp_hrm_task_id,
          erp_hrm_project_id: props.body.projectId,
        },
        select: { id: true },
      });
      // If task doesn't belong to new project, clear it (unless taskId was explicitly provided)
      if (!currentTask && targetTaskId === undefined) {
        targetTaskId = null;
      }
    }
  }
  // 8. Update the timer
  const updatedTimer = await MyGlobal.prisma.erp_hrm_timers.update({
    where: { id: props.timerId },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.projectId !== undefined && {
        erp_hrm_project_id: props.body.projectId,
      }),
      ...(targetTaskId !== undefined && {
        erp_hrm_task_id: targetTaskId,
      }),
      updated_at: new Date(),
    },
    ...ErpHrmTimerTransformer.select(),
  });
  // 9. Return the updated timer using transformer
  return await ErpHrmTimerTransformer.transform(updatedTimer);
}
