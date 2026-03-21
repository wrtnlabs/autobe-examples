import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  // STEP 1: Verify member has project:manage permission
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
      status: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  // Check for project:manage permission
  const rolePermissions =
    await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
      },
      select: {
        permission: true,
      },
    });
  const hasProjectManagePermission = rolePermissions.some(
    (rp) => rp.permission === "project:manage",
  );
  if (!hasProjectManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // STEP 2: Verify project exists and belongs to the organization
  const project = await MyGlobal.prisma.erp_hrm_projects.findUnique({
    where: {
      id: props.projectId,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.erp_hrm_organization_id !== employee.erp_hrm_organization_id) {
    throw new HttpException("Project not found", 404);
  }
  // STEP 3: Check if timelogs exist for this project
  const timelogCount = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: {
      erp_hrm_project_id: props.projectId,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException(
      "Cannot delete project. Time entries exist for this project. Please archive the project instead if you wish to prevent new entries.",
      409,
    );
  }
  // STEP 4: Delete project - Prisma cascade handles tasks and project_members deletion
  await MyGlobal.prisma.erp_hrm_projects.delete({
    where: {
      id: props.projectId,
    },
  });
}
