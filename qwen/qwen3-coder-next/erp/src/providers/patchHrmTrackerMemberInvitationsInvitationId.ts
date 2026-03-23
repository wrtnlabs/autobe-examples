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

export async function patchHrmTrackerMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string;
}): Promise<void> {
  const invitation =
    await MyGlobal.prisma.hrm_tracker_pending_invitations.findUniqueOrThrow({
      where: { id: props.invitationId },
      select: { status: true, organization_id: true },
    });
  if (invitation.status !== "pending") {
    throw new HttpException("Invitation is not pending", 409);
  }
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: invitation.organization_id,
      deleted_at: null,
    },
    select: { id: true, role_id: true },
  });
  if (!employee || employee.role_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasPermission =
    await MyGlobal.prisma.hrm_tracker_role_permissions.findFirst({
      where: {
        role_id: employee.role_id,
        permission: {
          permission: "employee:manage",
        },
      },
    });
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_tracker_pending_invitations.update({
    where: { id: props.invitationId },
    data: { status: "cancelled" },
  });
}
