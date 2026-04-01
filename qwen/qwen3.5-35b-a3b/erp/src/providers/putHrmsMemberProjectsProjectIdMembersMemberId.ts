import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsProjectMemberTransformer } from "../transformers/HrmsProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmsMemberProjectsProjectIdMembersMemberId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
  body: IHrmsProjectMember.IUpdate;
}): Promise<IHrmsProjectMember> {
  const { member, projectId, memberId, body } = props;
  // Validate at least one field is provided for update
  if (body.role === undefined && body.status === undefined) {
    throw new HttpException(
      "At least one of role or status must be provided",
      400,
    );
  }
  // Fetch project to validate it exists and get organization context
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: projectId },
    select: { id: true, hrms_organization_id: true },
  });
  // Fetch the project membership to validate it exists, belongs to project, and get state
  const membership =
    await MyGlobal.prisma.hrms_project_members.findUniqueOrThrow({
      where: { id: memberId },
      select: {
        id: true,
        project_id: true,
        employee_id: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Validate membership belongs to the specified project
  if (membership.project_id !== projectId) {
    throw new HttpException(
      "Project member does not belong to the specified project",
      404,
    );
  }
  // Validate membership is not soft-deleted
  if (membership.deleted_at !== null) {
    throw new HttpException("Cannot update a soft-deleted membership", 400);
  }
  // Validate user has project:manage permission (organization manager)
  const hasPermission =
    (await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_organization_id: project.hrms_organization_id,
        hrms_member_id: member.id,
        role: "manager",
      } as Prisma.hrms_organization_membersWhereInput,
    })) !== null;
  if (!hasPermission) {
    throw new HttpException(
      "Forbidden: You do not have project:manage permission",
      403,
    );
  }
  // Build update data with conditional assignment
  const updateData: {
    role?: "member" | "project-lead" | undefined;
    status?: "active" | "inactive" | undefined;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (body.role !== undefined) {
    updateData.role = body.role;
  }
  if (body.status !== undefined) {
    updateData.status = body.status;
  }
  // Perform update
  await MyGlobal.prisma.hrms_project_members.update({
    where: { id: memberId },
    data: updateData,
  });
  // Fetch updated record with full structure for transformation
  const fetchedMembership =
    await MyGlobal.prisma.hrms_project_members.findUniqueOrThrow({
      where: { id: memberId },
      ...HrmsProjectMemberTransformer.select(),
    });
  // Transform and return
  return await HrmsProjectMemberTransformer.transform(fetchedMembership);
}
