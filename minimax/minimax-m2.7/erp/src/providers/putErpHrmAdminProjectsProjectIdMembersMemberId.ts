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

export async function putErpHrmAdminProjectsProjectIdMembersMemberId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.IUpdate;
}): Promise<IErpHrmProjectMember> {
  // Validate project exists
  await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true },
  });
  // Validate membership exists and belongs to the project
  const membership =
    await MyGlobal.prisma.erp_hrm_project_members.findUniqueOrThrow({
      where: { id: props.memberId },
      select: {
        id: true,
        erp_hrm_project_id: true,
      },
    });
  // Verify membership belongs to the specified project
  if (membership.erp_hrm_project_id !== props.projectId) {
    throw new HttpException(
      "Project membership does not belong to the specified project",
      400,
    );
  }
  // Build update data from IUpdate fields
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.color !== undefined) {
    updateData.color = props.body.color;
  }
  if (props.body.budget_hours !== undefined) {
    updateData.budget_hours = props.body.budget_hours;
  }
  if (props.body.start_date !== undefined && props.body.start_date !== null) {
    updateData.start_date = props.body.start_date;
  }
  if (props.body.end_date !== undefined && props.body.end_date !== null) {
    updateData.end_date = props.body.end_date;
  }
  // Update project with new values
  await MyGlobal.prisma.erp_hrm_projects.update({
    where: { id: props.projectId },
    data: updateData,
  });
  // Fetch updated project with full relations for response
  const updatedProject =
    await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      ...ErpHrmProjectMemberTransformer.select(),
    });
  return await ErpHrmProjectMemberTransformer.transform(updatedProject);
}
