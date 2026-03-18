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
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirstOrThrow({
    where: {
      hrms_member_id: props.member.id,
      id: props.member.session_id,
      expired_at: { gt: new Date() },
    },
  });
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      hrms_organization_id: true,
      name: true,
      status: true,
      color_code: true,
      description: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
    },
  });
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: session.hrms_member_id,
        hrms_organization_id: project.hrms_organization_id,
      },
    });
  const hasPermission =
    (await MyGlobal.prisma.hrms_organization_role_permissions.findFirst({
      where: {
        hrms_organization_role_id: organizationMember.hrms_organization_role_id,
        permission: "project:manage",
      },
    })) !== null;
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  const membership =
    await MyGlobal.prisma.hrms_project_members.findUniqueOrThrow({
      where: { id: props.memberId },
      select: {
        id: true,
        employee_id: true,
        project_id: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (membership.project_id !== props.projectId) {
    throw new HttpException("Not found", 404);
  }
  if (membership.deleted_at !== null) {
    throw new HttpException("Not found", 404);
  }
  const updateData: {
    role?: "member" | "project-lead";
    status?: "active" | "inactive";
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.role !== undefined) {
    if (props.body.role !== "member" && props.body.role !== "project-lead") {
      throw new HttpException("Invalid role", 400);
    }
    updateData.role = props.body.role;
  }
  if (props.body.status !== undefined) {
    if (props.body.status !== "active" && props.body.status !== "inactive") {
      throw new HttpException("Invalid status", 400);
    }
    updateData.status = props.body.status;
  }
  await MyGlobal.prisma.hrms_project_members.update({
    where: { id: props.memberId },
    data: updateData,
  });
  const updatedMembership =
    await MyGlobal.prisma.hrms_project_members.findUniqueOrThrow({
      where: { id: props.memberId },
      ...HrmsProjectMemberTransformer.select(),
    });
  return await HrmsProjectMemberTransformer.transform(updatedMembership);
}
