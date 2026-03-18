import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimelogCollector } from "../collectors/ErpHrmTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimelog.ICreate;
}): Promise<IErpHrmTimelog> {
  // Validate time range
  const startTime = new Date(props.body.start_time);
  const endTime = new Date(props.body.end_time);
  if (startTime.getTime() >= endTime.getTime()) {
    throw new HttpException("Start time must be before end time", 400);
  }
  // Find the project and verify it exists
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.body.project_id },
    select: {
      id: true,
      organization_id: true,
    },
  });
  // Find the organization member record for this user in the project's organization
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (organizationMember === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Verify the employee is assigned to the project
  const projectMember = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        project_id: props.body.project_id,
        organization_member_id: organizationMember.id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (projectMember === null) {
    throw new HttpException("You are not assigned to this project", 403);
  }
  // If task_id is provided, verify it belongs to the project
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: {
        id: props.body.task_id,
        deleted_at: null,
      },
      select: { project_id: true },
    });
    if (task === null) {
      throw new HttpException("Task not found", 404);
    }
    if (task.project_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  // Use collector to prepare create data (handles duration calculation)
  const createData = await ErpHrmTimelogCollector.collect({
    body: props.body,
    organizationMember: { id: organizationMember.id },
  });
  // Validate calculated duration is positive
  if (createData.duration_minutes <= 0) {
    throw new HttpException("Duration must be greater than 0 minutes", 400);
  }
  // Create the timelog with proper select for transformation
  const created = await MyGlobal.prisma.erp_hrm_timelogs.create({
    data: createData,
    ...ErpHrmTimelogTransformer.select(),
  });
  // Transform and return
  return await ErpHrmTimelogTransformer.transform(created);
}
