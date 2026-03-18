import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskTransformer } from "../transformers/ErpHrmTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTask> {
  // Find organization members for this user with their role permissions
  const organizationMembers =
    await MyGlobal.prisma.erp_hrm_organization_members.findMany({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.erp_hrm_organization_membersFindManyArgs);
  if (organizationMembers.length === 0) {
    throw new HttpException("Organization member not found", 404);
  }
  // Check project membership for any of the user's organization memberships
  const projectMemberships =
    await MyGlobal.prisma.erp_hrm_project_members.findMany({
      where: {
        project_id: props.projectId,
        organization_member_id: {
          in: organizationMembers.map((om) => om.id),
        },
        deleted_at: null,
      },
      select: {
        role: true,
        organization_member_id: true,
      },
    } satisfies Prisma.erp_hrm_project_membersFindManyArgs);
  const isProjectMember = projectMemberships.length > 0;
  const isProjectLead = projectMemberships.some(
    (pm) => pm.role === "project-lead",
  );
  // Check if any organization member has project:manage permission
  const hasOrgProjectManage = organizationMembers.some((om) =>
    om.role.rolePermissions.some((rp) => rp.permission === "project:manage"),
  );
  // Authorization: must be project member, project-lead, or have org-level project:manage permission
  if (!isProjectMember && !isProjectLead && !hasOrgProjectManage) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the task with transformer select
  const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      project_id: props.projectId,
      deleted_at: null,
    },
    ...ErpHrmTaskTransformer.select(),
  });
  return await ErpHrmTaskTransformer.transform(task);
}
