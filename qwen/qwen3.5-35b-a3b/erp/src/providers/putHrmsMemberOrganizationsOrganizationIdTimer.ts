import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTimerTransformer } from "../transformers/HrmsTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmsMemberOrganizationsOrganizationIdTimer(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsTimer.IUpdate;
}): Promise<IHrmsTimer> {
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: {
      hrms_member_id: props.member.id,
      id: props.member.session_id,
      expired_at: { gt: new Date() },
    },
  });
  if (session === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const orgMember = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: props.organizationId,
    },
  });
  if (orgMember === null) {
    throw new HttpException("Organization access denied", 403);
  }
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: orgMember.id,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  const timerWhere: Prisma.hrms_timersWhereInput = {
    hrms_employee_id: employee.id,
    deleted_at: null,
  };
  if (props.body.hrms_project_id !== undefined) {
    timerWhere.hrms_project_id = props.body.hrms_project_id;
  }
  const timer = await MyGlobal.prisma.hrms_timers.findFirst({
    where: timerWhere,
    include: {
      employee: { select: { id: true } },
      project: { select: { id: true, hrms_organization_id: true } },
      task: { select: { id: true, hrms_project_id: true } },
    },
  });
  if (timer === null) {
    throw new HttpException("Timer not found", 404);
  }
  if (timer.hrms_employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.hrms_project_id !== undefined) {
    const project = await MyGlobal.prisma.hrms_projects.findUnique({
      where: {
        id: props.body.hrms_project_id,
        hrms_organization_id: props.organizationId,
      },
    });
    if (project === null) {
      throw new HttpException("Project not found", 404);
    }
    const projectMember = await MyGlobal.prisma.hrms_project_members.findFirst({
      where: {
        employee_id: employee.id,
        project_id: props.body.hrms_project_id,
      },
    });
    if (projectMember === null) {
      throw new HttpException("Employee not assigned to project", 404);
    }
  }
  if (props.body.hrms_task_id !== undefined) {
    const taskProjectId = props.body.hrms_project_id ?? timer.hrms_project_id;
    if (props.body.hrms_task_id === null) {
      // Task being removed, no validation needed
    } else {
      const task = await MyGlobal.prisma.hrms_tasks.findUnique({
        where: {
          id: props.body.hrms_task_id,
          hrms_project_id: taskProjectId,
        },
      });
      if (task === null) {
        throw new HttpException("Task not found", 404);
      }
      const projectMember =
        await MyGlobal.prisma.hrms_project_members.findFirst({
          where: {
            employee_id: employee.id,
            project_id: task.hrms_project_id,
          },
        });
      if (projectMember === null) {
        throw new HttpException("Employee not assigned to task's project", 404);
      }
    }
  }
  const updateData: Prisma.hrms_timersUpdateInput = {
    description: props.body.description,
    updated_at: new Date(),
  };
  if (props.body.hrms_project_id !== undefined) {
    updateData.project = {
      connect: { id: props.body.hrms_project_id },
    };
  }
  if (props.body.hrms_task_id !== undefined) {
    updateData.task =
      props.body.hrms_task_id === null
        ? { disconnect: true }
        : { connect: { id: props.body.hrms_task_id } };
  }
  const updatedTimer = await MyGlobal.prisma.hrms_timers.update({
    where: { id: timer.id },
    data: updateData,
    include: {
      employee: {
        select: {
          id: true,
          display_name: true,
          department_id: true,
          position: true,
          status: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          color_code: true,
          hrms_organization_id: true,
          status: true,
          budget_hours: true,
          start_date: true,
          end_date: true,
          created_at: true,
          updated_at: true,
        },
      },
      task: {
        select: {
          id: true,
          hrms_project_id: true,
        },
      },
    },
  });
  return HrmsTimerTransformer.transform(updatedTimer);
}
