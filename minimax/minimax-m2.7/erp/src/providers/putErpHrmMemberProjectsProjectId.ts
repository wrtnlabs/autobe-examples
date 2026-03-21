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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectMemberTransformer } from "../transformers/ErpHrmProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.IUpdate;
}): Promise<IErpHrmProjectMember> {
  // 1. Fetch the existing project to get organization_id and validate existence
  const existingProject =
    await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        id: true,
        erp_hrm_organization_id: true,
        name: true,
      },
    });
  // 2. If name is being changed, verify uniqueness within the organization
  if (
    props.body.name !== undefined &&
    props.body.name !== existingProject.name
  ) {
    const conflictingProject = await MyGlobal.prisma.erp_hrm_projects.findFirst(
      {
        where: {
          erp_hrm_organization_id: existingProject.erp_hrm_organization_id,
          name: props.body.name,
          id: { not: props.projectId },
        },
      },
    );
    if (conflictingProject) {
      throw new HttpException(
        "Project name already exists in this organization",
        409,
      );
    }
  }
  // 3. Build update data with only provided fields
  const updateData: Prisma.erp_hrm_projectsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.color !== undefined) {
    updateData.color = props.body.color;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.budget_hours !== undefined) {
    updateData.budget_hours = props.body.budget_hours;
  }
  if (props.body.start_date !== undefined) {
    updateData.start_date =
      props.body.start_date !== null ? new Date(props.body.start_date) : null;
  }
  if (props.body.end_date !== undefined) {
    updateData.end_date =
      props.body.end_date !== null ? new Date(props.body.end_date) : null;
  }
  // 4. Update the project
  await MyGlobal.prisma.erp_hrm_projects.update({
    where: { id: props.projectId },
    data: updateData,
  });
  // 5. Fetch the complete updated project using transformer
  const updatedProject =
    await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      ...ErpHrmProjectMemberTransformer.select(),
    });
  // 6. Transform and return
  return await ErpHrmProjectMemberTransformer.transform(updatedProject);
}
