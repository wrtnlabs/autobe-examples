import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTaskCollector } from "../collectors/ErpHrmTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskTransformer } from "../transformers/ErpHrmTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTask.ICreate;
}): Promise<IErpHrmTask> {
  // 1. Validate project exists
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  // 2. Check authorization: project:manage OR project-lead role
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: project.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (!memberEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for project:manage permission
  const hasManagePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: memberEmployee.erp_hrm_role_id,
        permission: "project:manage",
      },
    });
  // Check for project-lead role on this project
  const isProjectLead = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        erp_hrm_project_id: props.projectId,
        erp_hrm_employee_id: memberEmployee.id,
        assigned_role: "project-lead",
      },
    },
  );
  if (!hasManagePermission && !isProjectLead) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. If erp_hrm_employee_id provided, verify employee is project member
  if (props.body.erp_hrm_employee_id) {
    const isProjectMember =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_project_id: props.projectId,
          erp_hrm_employee_id: props.body.erp_hrm_employee_id,
        },
      });
    if (!isProjectMember) {
      throw new HttpException(
        "Only project members can be assigned to tasks",
        400,
      );
    }
  }
  // 4. If parent_id provided, verify parent exists, belongs to same project, and has no parent
  if (props.body.parent_id) {
    const parentTask = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
      where: { id: props.body.parent_id },
      select: {
        id: true,
        erp_hrm_project_id: true,
        parent_id: true,
      },
    });
    if (parentTask.erp_hrm_project_id !== props.projectId) {
      throw new HttpException(
        "Parent task must belong to the same project",
        400,
      );
    }
    if (parentTask.parent_id !== null) {
      throw new HttpException(
        "Cannot create subtask under a subtask (one level nesting only)",
        400,
      );
    }
  }
  // 5. Create task
  const createdTask = await MyGlobal.prisma.erp_hrm_tasks.create({
    data: await ErpHrmTaskCollector.collect({
      body: props.body,
      erpHrmProjects: { id: props.projectId },
    }),
    ...ErpHrmTaskTransformer.select(),
  });
  // 6. Return created task
  return await ErpHrmTaskTransformer.transform(createdTask);
}
