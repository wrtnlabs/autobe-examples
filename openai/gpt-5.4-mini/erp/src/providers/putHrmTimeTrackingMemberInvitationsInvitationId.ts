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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingInvitation.IUpdate;
}): Promise<IHrmTimeTrackingInvitation> {
  const member = await MyGlobal.prisma.hrm_time_tracking_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
      is_active: true,
    },
    select: {
      id: true,
    },
  });
  if (member === null) throw new HttpException("Forbidden", 403);
  const invitation =
    await MyGlobal.prisma.hrm_time_tracking_invitations.findUnique({
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
  if (invitation === null || invitation.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const nextEmail: string = props.body.email ?? invitation.email;
  const nextStatus: string = props.body.status ?? invitation.status;
  const nextExpiresAt: string & tags.Format<"date-time"> =
    props.body.expiresAt ?? invitation.expires_at.toISOString();
  if (
    nextStatus === "accepted" &&
    invitation.accepted_at !== null &&
    props.body.status === undefined
  ) {
    throw new HttpException("Unprocessable Entity", 422);
  }
  if (
    nextStatus === "revoked" &&
    invitation.revoked_at !== null &&
    props.body.status === undefined
  ) {
    throw new HttpException("Unprocessable Entity", 422);
  }
  if (props.body.email !== undefined) {
    const duplicated =
      await MyGlobal.prisma.hrm_time_tracking_invitations.findFirst({
        where: {
          organization_id: invitation.organization_id,
          email: nextEmail,
          id: { not: invitation.id },
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (duplicated !== null) throw new HttpException("Conflict", 409);
  }
  if (
    props.body.userAccountId !== undefined &&
    props.body.userAccountId !== null
  ) {
    const account =
      await MyGlobal.prisma.hrm_time_tracking_user_accounts.findFirst({
        where: {
          id: props.body.userAccountId,
        },
        select: {
          id: true,
        },
      });
    if (account === null) throw new HttpException("Unprocessable Entity", 422);
  }
  if (
    props.body.invitedByMemberId !== undefined &&
    props.body.invitedByMemberId !== null
  ) {
    const inviter = await MyGlobal.prisma.hrm_time_tracking_members.findFirst({
      where: {
        id: props.body.invitedByMemberId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (inviter === null) throw new HttpException("Unprocessable Entity", 422);
  }
  await MyGlobal.prisma.hrm_time_tracking_invitations.update({
    where: {
      id: invitation.id,
    },
    data: {
      ...(props.body.email !== undefined && { email: nextEmail }),
      ...(props.body.userAccountId !== undefined && {
        user_account_id: props.body.userAccountId,
      }),
      ...(props.body.invitedByMemberId !== undefined && {
        invited_by_member_id: props.body.invitedByMemberId,
      }),
      ...(props.body.status !== undefined && { status: nextStatus }),
      ...(props.body.expiresAt !== undefined && {
        expires_at: new Date(nextExpiresAt),
      }),
      ...(props.body.status === "accepted" &&
        invitation.accepted_at === null && { accepted_at: new Date() }),
      ...(props.body.status === "revoked" &&
        invitation.revoked_at === null && { revoked_at: new Date() }),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_invitations.findUniqueOrThrow({
      where: {
        id: invitation.id,
      },
      ...HrmTimeTrackingInvitationTransformer.select(),
    });
  return await HrmTimeTrackingInvitationTransformer.transform(updated);
}
