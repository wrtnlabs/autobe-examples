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

export async function deleteHrmPlatformMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: true,
              },
            },
          },
        },
      },
    });
  const hasManagePermission = employee.role.rolePermissions.some(
    (p: { permission: string }) => p.permission === "employee:manage",
  );
  if (!hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  const invitation =
    await MyGlobal.prisma.hrm_platform_invitations.findUniqueOrThrow({
      where: {
        id: props.invitationId,
        deleted_at: null,
      },
      select: {
        organization_id: true,
        status: true,
        user_id: true,
      },
    });
  if (invitation.organization_id !== employee.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  if (invitation.status !== "pending") {
    throw new HttpException("Invitation is not in pending status", 409);
  }
  if (invitation.user_id !== null) {
    throw new HttpException("Invitation has already been accepted", 409);
  }
  await MyGlobal.prisma.hrm_platform_invitations.update({
    where: {
      id: props.invitationId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
