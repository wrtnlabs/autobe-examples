import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingInvitationTransformer } from "../transformers/HrmTimeTrackingInvitationTransformer";
import { HrmTimeTrackingMemberTransformer } from "../transformers/HrmTimeTrackingMemberTransformer";
import { HrmTimeTrackingOrganizationTransformer } from "../transformers/HrmTimeTrackingOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberInvitationsTokenAccept(props: {
  member: MemberPayload;
  token: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingInvitation> {
  const now = toISOStringSafe(new globalThis.Date());
  const invitation =
    await MyGlobal.prisma.hrm_time_tracking_invitations.findUnique({
      where: { token: props.token },
      select: {
        id: true,
        organization_id: true,
        user_account_id: true,
        email: true,
        status: true,
        expires_at: true,
        accepted_at: true,
        revoked_at: true,
        deleted_at: true,
        organization: HrmTimeTrackingOrganizationTransformer.select(),
        userAccount: true,
        invitedByMember: HrmTimeTrackingMemberTransformer.select(),
      },
    });
  if (invitation === null) {
    throw new HttpException("Invitation not found", 404);
  }
  if (invitation.deleted_at !== null) {
    throw new HttpException("Invitation is no longer available", 409);
  }
  if (invitation.status !== "pending") {
    throw new HttpException("Invitation is not pending", 409);
  }
  if (invitation.accepted_at !== null || invitation.revoked_at !== null) {
    throw new HttpException("Invitation has already been consumed", 409);
  }
  if (toISOStringSafe(invitation.expires_at) < now) {
    throw new HttpException("Invitation has expired", 409);
  }
  if (invitation.user_account_id !== null) {
    if (invitation.user_account_id !== props.member.id) {
      throw new HttpException(
        "Invitation email does not match the current member",
        422,
      );
    }
  }
  await MyGlobal.prisma.hrm_time_tracking_invitations.update({
    where: { token: props.token },
    data: {
      status: "accepted",
      accepted_at: new globalThis.Date(),
      updated_at: new globalThis.Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_invitations.findUniqueOrThrow({
      where: { token: props.token },
      ...HrmTimeTrackingInvitationTransformer.select(),
    });
  return await HrmTimeTrackingInvitationTransformer.transform(updated);
}
