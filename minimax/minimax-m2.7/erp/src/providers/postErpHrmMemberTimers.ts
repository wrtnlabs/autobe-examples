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
import { ErpHrmTimerCollector } from "../collectors/ErpHrmTimerCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerTransformer } from "../transformers/ErpHrmTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimers(props: {
  member: MemberPayload;
  body: IErpHrmTimer.ICreate;
}): Promise<IErpHrmTimer> {
  // Step 1: Get authenticated employee from session
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      erp_hrm_member_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  // Step 2: Validate employee is active
  if (employee.status === "deactivated") {
    throw new HttpException(
      "Cannot start timer. Your employee account is deactivated.",
      403,
    );
  }
  // Step 3: Check for existing active timer
  const existingTimer = await MyGlobal.prisma.erp_hrm_timers.findFirst({
    where: {
      erp_hrm_employee_id: employee.id,
    },
    select: {
      id: true,
    },
  });
  if (existingTimer !== null) {
    throw new HttpException(
      "An active timer already exists. Stop or discard the existing timer before starting a new one.",
      409,
    );
  }
  // Step 4: Validate project assignment
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.body.erp_hrm_project_id,
      },
      select: {
        id: true,
      },
    });
  if (projectMembership === null) {
    throw new HttpException("You are not a member of this project", 403);
  }
  // Step 5: Validate task belongs to project if provided
  if (
    props.body.erp_hrm_task_id !== undefined &&
    props.body.erp_hrm_task_id !== null
  ) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.erp_hrm_task_id,
        erp_hrm_project_id: props.body.erp_hrm_project_id,
      },
      select: {
        id: true,
      },
    });
    if (task === null) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  // Step 6: Get member session for collector
  const memberSession = await MyGlobal.prisma.erp_hrm_member_sessions.findFirst(
    {
      where: {
        id: props.member.session_id,
      },
      select: {
        id: true,
      },
    },
  );
  if (memberSession === null) {
    throw new HttpException("Session not found", 404);
  }
  // Create entity objects for collector
  const employeeEntity: IEntity = {
    id: employee.id as string & tags.Format<"uuid">,
  };
  const sessionEntity: IEntity = {
    id: memberSession.id as string & tags.Format<"uuid">,
  };
  // Step 7: Create timer using collector
  const created = await MyGlobal.prisma.erp_hrm_timers.create({
    data: await ErpHrmTimerCollector.collect({
      body: props.body,
      erpHrmEmployees: employeeEntity,
      erpHrmMemberSessions: sessionEntity,
    }),
    ...ErpHrmTimerTransformer.select(),
  });
  // Step 8: Return transformed response
  return await ErpHrmTimerTransformer.transform(created);
}
