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

export async function deleteHrmTimeTrackingMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const invitation =
    await MyGlobal.prisma.hrm_time_tracking_invitations.findUniqueOrThrow({
      where: {
        id: props.invitationId,
      },
      select: {
        id: true,
        organization_id: true,
        user_account_id: true,
        invited_by_member_id: true,
        email: true,
        token: true,
        status: true,
        expires_at: true,
        accepted_at: true,
        revoked_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (invitation.status !== "pending") {
    throw new HttpException(
      "Invitation is no longer eligible for deletion",
      409,
    );
  }
  await MyGlobal.prisma.hrm_time_tracking_invitations.delete({
    where: {
      id: invitation.id,
    },
  });
}
