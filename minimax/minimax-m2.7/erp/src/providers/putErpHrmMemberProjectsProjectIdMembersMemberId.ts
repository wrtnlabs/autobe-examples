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

export async function putErpHrmMemberProjectsProjectIdMembersMemberId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.IUpdate;
}): Promise<IErpHrmProjectMember> {
  // 1. Fetch the project membership to verify it exists and belongs to the project
  const membership = await MyGlobal.prisma.erp_hrm_project_members.findUnique({
    where: { id: props.memberId },
    select: {
      id: true,
      erp_hrm_project_id: true,
      project: {
        select: {
          id: true,
          erp_hrm_organization_id: true,
        },
      },
    },
  });
  // 2. Validate membership exists
  if (membership === null) {
    throw new HttpException("Project member not found", 404);
  }
  // 3. Validate membership belongs to the specified project
  if (membership.erp_hrm_project_id !== props.projectId) {
    throw new HttpException(
      "Project member does not belong to the specified project",
      400,
    );
  }
  // 4. Fetch the project to verify it exists
  const project = await MyGlobal.prisma.erp_hrm_projects.findUnique({
    where: { id: props.projectId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // 5. Build dynamic update data from provided optional fields
  const updateData: Prisma.erp_hrm_projectsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.budget_hours !== undefined) {
    updateData.budget_hours = props.body.budget_hours;
  }
  if (props.body.color !== undefined) {
    updateData.color = props.body.color;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.end_date !== undefined) {
    updateData.end_date =
      props.body.end_date !== null ? new Date(props.body.end_date) : null;
  }
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.start_date !== undefined) {
    updateData.start_date =
      props.body.start_date !== null ? new Date(props.body.start_date) : null;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  // 6. Update the project
  await MyGlobal.prisma.erp_hrm_projects.update({
    where: { id: props.projectId },
    data: updateData,
  });
  // 7. Fetch updated project with all relations using transformer
  const updatedProject =
    await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      ...ErpHrmProjectMemberTransformer.select(),
    });
  // 8. Transform and return the response
  return await ErpHrmProjectMemberTransformer.transform(updatedProject);
}
