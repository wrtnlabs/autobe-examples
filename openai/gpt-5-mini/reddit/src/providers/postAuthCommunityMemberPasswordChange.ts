import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function postAuthCommunityMemberPasswordChange(props: {
  communityMember: CommunitymemberPayload;
  body: ICommunityBbsCommunityMember.IChangePassword;
}): Promise<ICommunityBbsCommunityMember.IMessage> {
  const { communityMember, body } = props;

  // Load member and validate account state
  const member =
    await MyGlobal.prisma.community_bbs_communitymember.findUniqueOrThrow({
      where: { id: communityMember.id },
    });

  if (member.deleted_at !== null)
    throw new HttpException("Unauthorized: account is deleted", 403);

  if (
    member.status === "deleted_soft" ||
    member.status === "banned" ||
    member.status === "suspended"
  )
    throw new HttpException("Unauthorized: account not active", 403);

  // Verify the provided current password against stored hash
  const isCurrentValid = await PasswordUtil.verify(
    body.currentPassword,
    member.password_hash,
  );
  if (!isCurrentValid)
    throw new HttpException("Unauthorized: current password is incorrect", 401);

  // Derive new password hash
  const newPasswordHash = await PasswordUtil.hash(body.newPassword);

  // Timestamp for updates and audit
  const now = toISOStringSafe(new Date());

  // Persist the new password hash and updated_at
  await MyGlobal.prisma.community_bbs_communitymember.update({
    where: { id: member.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: now,
    },
  });

  // Revoke existing sessions by marking expired_at (secure default: revoke when omitted)
  const shouldRevoke =
    body.revokeSessions === undefined ? true : body.revokeSessions === true;
  if (shouldRevoke) {
    await MyGlobal.prisma.community_bbs_communitymember_sessions.updateMany({
      where: {
        community_bbs_communitymember_id: member.id,
        expired_at: null,
      },
      data: { expired_at: now },
    });
  }

  // Record an audit log entry without exposing sensitive data
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "community_member",
      actor_id: communityMember.id,
      entity: "user",
      action: "password.change",
      payload: JSON.stringify({ revokeSessions: shouldRevoke }),
      created_at: now,
      updated_at: now,
    },
  });

  return {
    message: "Password changed successfully",
    code: shouldRevoke ? "SESSIONS_REVOKED" : "PASSWORD_CHANGED",
    timestamp: now,
  };
}
