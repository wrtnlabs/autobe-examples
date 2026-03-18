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

export async function patchErpHrmMemberProjectsProjectIdArchive(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProject.IUpdate;
}): Promise<IErpHrmProject> {
  // Verify project exists
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      organization_id: true,
      status: true,
      deleted_at: true,
    },
  });
  // Verify member belongs to the project's organization
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (orgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate project is not soft-deleted
  if (project.deleted_at !== null) {
    throw new HttpException("Project has been deleted", 403);
  }
  // Validate project status is 'active'
  if (project.status !== "active") {
    throw new HttpException("Project must be active to archive", 409);
  }
  // Update project status to archived
  const updated = await MyGlobal.prisma.erp_hrm_projects.update({
    where: { id: props.projectId },
    data: {
      status: "archived",
      updated_at: new Date(),
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.colorCode !== undefined && {
        color_code: props.body.colorCode,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.budgetHours !== undefined && {
        budget_hours: props.body.budgetHours,
      }),
      ...(props.body.startDate !== undefined && {
        start_date: props.body.startDate
          ? new Date(props.body.startDate)
          : null,
      }),
      ...(props.body.endDate !== undefined && {
        end_date: props.body.endDate ? new Date(props.body.endDate) : null,
      }),
    },
    ...ErpHrmProjectTransformer.select(),
  });
  return await ErpHrmProjectTransformer.transform(updated);
}
