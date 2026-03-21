import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
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
  // Get member's session to find current organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization context selected", 400);
  }
  // Find employee record for this member in the current organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUnique({
    where: {
      erp_hrm_member_id_erp_hrm_organization_id: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
      },
    },
    select: { id: true, erp_hrm_role_id: true },
  });
  if (!employee) {
    throw new HttpException(
      "Employee record not found in current organization",
      403,
    );
  }
  // Check if role has project:manage permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findUnique({
    where: {
      erp_hrm_role_id_permission: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "project:manage",
      },
    },
  });
  if (!permission) {
    throw new HttpException(
      "Forbidden - project:manage permission required",
      403,
    );
  }
  // Verify project exists and belongs to user's organization
  const existingProject =
    await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: { id: true, organization_id: true },
    });
  if (existingProject.organization_id !== session.erp_hrm_organization_id) {
    throw new HttpException("Project not found in current organization", 404);
  }
  // Update project with provided fields
  await MyGlobal.prisma.erp_hrm_projects.update({
    where: { id: props.projectId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.color_code !== undefined && {
        color_code: props.body.color_code,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.budget_hours !== undefined && {
        budget_hours: props.body.budget_hours,
      }),
      ...(props.body.start_date !== undefined && {
        start_date: props.body.start_date
          ? new Date(props.body.start_date)
          : null,
      }),
      ...(props.body.end_date !== undefined && {
        end_date: props.body.end_date ? new Date(props.body.end_date) : null,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and return updated project using transformer
  const updatedProject =
    await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      ...ErpHrmProjectTransformer.select(),
    });
  return ErpHrmProjectTransformer.transform(updatedProject);
}
