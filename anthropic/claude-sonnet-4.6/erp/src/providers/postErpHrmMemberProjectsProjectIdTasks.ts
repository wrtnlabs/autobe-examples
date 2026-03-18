import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
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
  // Step 1: Fetch the project to get organization_id, ensuring it is not deleted
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirstOrThrow({
    where: { id: props.projectId, deleted_at: null },
    select: { id: true, organization_id: true },
  });
  // Step 2: Resolve the caller's org member record in this organization
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: { id: true, role_id: true },
    });
  // Step 3a: Check if the caller has 'project:manage' permission via their role
  const hasProjectManage =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: orgMember.role_id,
        permission_code: "project:manage",
      },
      select: { id: true },
    });
  // Step 3b: If no org-level permission, check if the caller is a project-lead in this project
  const projectLeadMembership = !hasProjectManage
    ? await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          project_id: props.projectId,
          organization_member_id: orgMember.id,
          project_role: "project-lead",
          deleted_at: null,
        },
        select: { id: true },
      })
    : null;
  if (!hasProjectManage && !projectLeadMembership) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Validate assignee_id if provided — must be an active project member
  if (props.body.assignee_id) {
    const assigneeProjectMember =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          project_id: props.projectId,
          organization_member_id: props.body.assignee_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!assigneeProjectMember) {
      throw new HttpException(
        "Assignee is not an active project member of this project",
        422,
      );
    }
  }
  // Step 5: Validate parent_id if provided — must be a top-level task in the same project
  if (props.body.parent_id) {
    const parentTask = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.parent_id,
        erp_hrm_project_id: props.projectId,
        deleted_at: null,
      },
      select: { id: true, parent_id: true },
    });
    if (!parentTask) {
      throw new HttpException("Parent task not found in this project", 422);
    }
    if (parentTask.parent_id !== null) {
      throw new HttpException(
        "Parent task is itself a subtask; only one level of nesting is permitted",
        422,
      );
    }
  }
  // Step 6: Create the task using the collector (handles defaults for status/priority)
  const initialStatus = props.body.status ?? "open";
  const created = await MyGlobal.prisma.erp_hrm_tasks.create({
    data: await ErpHrmTaskCollector.collect({
      body: props.body,
      erpHrmProjects: { id: project.id },
      erpHrmMembers: { id: props.member.id },
      erpHrmMemberSessions: { id: props.member.session_id },
    }),
    select: { id: true },
  });
  // Step 7: Insert the initial task history entry for the creation event
  await MyGlobal.prisma.erp_hrm_task_histories.create({
    data: {
      id: v4(),
      task: { connect: { id: created.id } },
      organizationMember: { connect: { id: orgMember.id } },
      old_status: initialStatus,
      new_status: initialStatus,
      created_at: new Date(),
    },
  });
  // Step 8: Fetch and return the full task detail using the transformer
  const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: created.id },
    ...ErpHrmTaskTransformer.select(),
  });
  return await ErpHrmTaskTransformer.transform(task);
}
