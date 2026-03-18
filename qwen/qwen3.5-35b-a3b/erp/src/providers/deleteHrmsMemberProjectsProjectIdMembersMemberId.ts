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

export async function deleteHrmsMemberProjectsProjectIdMembersMemberId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const membership =
    await MyGlobal.prisma.hrms_project_members.findUniqueOrThrow({
      where: { id: props.memberId },
      select: {
        id: true,
        employee_id: true,
        project_id: true,
        employee: {
          select: { organization_member_id: true },
        },
        project: {
          select: {
            id: true,
            organization: {
              select: { id: true },
            },
          },
        },
      },
    });
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: {
      hrms_member_id: props.member.id,
      id: props.member.session_id,
      expired_at: { gt: new Date() },
    },
  });
  if (session === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const [memberOrgMember, projectOrgMember] = await Promise.all([
    MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: membership.project.organization.id,
      },
      include: { organizationRole: { include: { permissions: true } } },
    }),
    MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: membership.employee.organization_member_id,
        hrms_organization_id: membership.project.organization.id,
        organizationRole: {
          name: "Owner",
        },
      },
    }),
  ]);
  if (
    memberOrgMember === null ||
    !memberOrgMember.organizationRole.permissions.some(
      (p: { permission: string }) => p.permission === "project:manage",
    )
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (projectOrgMember !== null) {
    throw new HttpException(
      "Cannot remove organization owner from project",
      403,
    );
  }
  const currentTime = toISOStringSafe(new Date());
  await MyGlobal.prisma.hrms_project_members.update({
    where: { id: props.memberId },
    data: {
      deleted_at: currentTime,
      updated_at: currentTime,
    },
  });
}
