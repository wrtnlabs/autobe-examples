import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectTransformer } from "../transformers/ErpHrmProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProject.IUpdate;
}): Promise<IErpHrmProject> {
  // Fetch project and verify it exists and is not deleted
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId, deleted_at: null },
    select: {
      id: true,
      organization_id: true,
      name: true,
    },
  });
  // Get member's organization membership to check permissions
  const membership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            rolePermissions: {
              select: { permission: true },
            },
          },
        },
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for project:manage permission
  const hasProjectManagePermission = membership.role.rolePermissions.some(
    (p: { permission: string }) => p.permission === "project:manage",
  );
  if (!hasProjectManagePermission) {
    // Check if user is project-lead for this specific project
    const projectMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          project_id: props.projectId,
          organization_member_id: membership.id,
          role: "project-lead",
          deleted_at: null,
        },
      });
    if (projectMembership === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Validate name uniqueness if name is being changed
  if (props.body.name !== undefined && props.body.name !== project.name) {
    const existingProject = await MyGlobal.prisma.erp_hrm_projects.findFirst({
      where: {
        organization_id: project.organization_id,
        name: props.body.name,
        deleted_at: null,
        id: { not: props.projectId },
      },
    });
    if (existingProject !== null) {
      throw new HttpException(
        "Project name already exists in this organization",
        400,
      );
    }
  }
  // Apply updates
  const updateData: Prisma.erp_hrm_projectsUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.colorCode !== undefined && {
      color_code: props.body.colorCode,
    }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.budgetHours !== undefined && {
      budget_hours: props.body.budgetHours,
    }),
    ...(props.body.startDate !== undefined && {
      start_date:
        props.body.startDate === null ? null : new Date(props.body.startDate),
    }),
    ...(props.body.endDate !== undefined && {
      end_date:
        props.body.endDate === null ? null : new Date(props.body.endDate),
    }),
    updated_at: new Date(),
  };
  await MyGlobal.prisma.erp_hrm_projects.update({
    where: { id: props.projectId },
    data: updateData,
  });
  // Fetch updated project with full details using transformer select
  const updatedProject =
    await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      ...ErpHrmProjectTransformer.select(),
    });
  return await ErpHrmProjectTransformer.transform(updatedProject);
}
