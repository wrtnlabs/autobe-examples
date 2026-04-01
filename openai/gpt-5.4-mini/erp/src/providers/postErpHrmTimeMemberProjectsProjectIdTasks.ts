import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTaskCollector } from "../collectors/ErpHrmTimeTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTaskTransformer } from "../transformers/ErpHrmTimeTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTask.ICreate;
}): Promise<IErpHrmTimeTask> {
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_time_organization_id: true,
    },
  });
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_time_project_memberships.findFirst({
      where: {
        erp_hrm_time_project_id: project.id,
        erp_hrm_time_employee_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        project_role: true,
      },
    });
  if (projectMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const canManageByProjectLead =
    projectMembership.project_role === "project-lead";
  const canManageByPermission =
    projectMembership.project_role === "project-manager" ||
    projectMembership.project_role === "owner";
  if (!canManageByProjectLead && !canManageByPermission) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.employeeId !== undefined && props.body.employeeId !== null) {
    const employeeMembership =
      await MyGlobal.prisma.erp_hrm_time_project_memberships.findFirst({
        where: {
          erp_hrm_time_project_id: project.id,
          erp_hrm_time_employee_id: props.body.employeeId,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (employeeMembership === null) {
      throw new HttpException("Invalid task assignment", 400);
    }
  }
  if (
    props.body.parentTaskId !== undefined &&
    props.body.parentTaskId !== null
  ) {
    const parentTask =
      await MyGlobal.prisma.erp_hrm_time_tasks.findFirstOrThrow({
        where: {
          id: props.body.parentTaskId,
          erp_hrm_time_project_id: project.id,
          deleted_at: null,
        },
        select: {
          id: true,
          parent_task_id: true,
        },
      });
    if (parentTask.parent_task_id !== null) {
      throw new HttpException("Invalid parent task nesting", 400);
    }
  }
  const created = await MyGlobal.prisma.erp_hrm_time_tasks.create({
    data: await ErpHrmTimeTaskCollector.collect({
      body: props.body,
      erpHrmTimeProjects: project,
    }),
  });
  const task = await MyGlobal.prisma.erp_hrm_time_tasks.findUniqueOrThrow({
    where: {
      id: created.id,
    },
    ...ErpHrmTimeTaskTransformer.select(),
  });
  return await ErpHrmTimeTaskTransformer.transform(task);
}
