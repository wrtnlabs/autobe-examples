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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmProjectMemberTransformer } from "../transformers/ErpHrmProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminProjectsProjectId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.IUpdate;
}): Promise<IErpHrmProjectMember> {
  // Validate at least one field is provided for update
  const hasUpdates =
    props.body.name !== undefined ||
    props.body.description !== undefined ||
    props.body.color !== undefined ||
    props.body.status !== undefined ||
    props.body.budget_hours !== undefined ||
    props.body.start_date !== undefined ||
    props.body.end_date !== undefined;
  if (!hasUpdates) {
    throw new HttpException(
      "At least one field must be provided for update",
      400,
    );
  }
  // Fetch the existing project to get organization context
  const existingProject =
    await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        id: true,
        erp_hrm_organization_id: true,
        name: true,
      },
    });
  // If name is being changed, verify uniqueness within the same organization
  if (
    props.body.name !== undefined &&
    props.body.name !== existingProject.name
  ) {
    const conflictProject = await MyGlobal.prisma.erp_hrm_projects.findFirst({
      where: {
        erp_hrm_organization_id: existingProject.erp_hrm_organization_id,
        name: props.body.name,
        id: { not: props.projectId },
      },
    });
    if (conflictProject) {
      throw new HttpException(
        `Project with name "${props.body.name}" already exists in this organization`,
        409,
      );
    }
  }
  // Build update data with only provided fields
  const updateData = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.color !== undefined && { color: props.body.color }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.budget_hours !== undefined && {
      budget_hours: props.body.budget_hours,
    }),
    ...(props.body.start_date !== undefined && {
      start_date: props.body.start_date,
    }),
    ...(props.body.end_date !== undefined && { end_date: props.body.end_date }),
    updated_at: new Date(),
  };
  // Update the project
  await MyGlobal.prisma.erp_hrm_projects.update({
    where: { id: props.projectId },
    data: updateData,
  });
  // Fetch the updated project with full relations for response
  const updatedProject =
    await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      ...ErpHrmProjectMemberTransformer.select(),
    });
  return await ErpHrmProjectMemberTransformer.transform(updatedProject);
}
