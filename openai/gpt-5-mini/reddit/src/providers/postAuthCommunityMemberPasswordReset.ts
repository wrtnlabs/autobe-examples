import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

export async function postAuthCommunityMemberPasswordReset(props: {
  body: ICommunityBbsCommunityMember.IResetPassword;
}): Promise<ICommunityBbsCommunityMember.IResetPasswordResponse> {
  const { token, password, ip } = props.body;

  const now = toISOStringSafe(new Date());

  const candidates =
    await MyGlobal.prisma.community_bbs_communitymember.findMany({
      where: {
        password_reset_token_hash: { not: null },
        password_reset_expires_at: { gte: now },
      },
    });

  for (const candidate of candidates) {
    if (!candidate.password_reset_token_hash) continue;

    const verified = await PasswordUtil.verify(
      token,
      candidate.password_reset_token_hash,
    );
    if (!verified) continue;

    const newPasswordHash = await PasswordUtil.hash(password);

    await MyGlobal.prisma.community_bbs_communitymember.update({
      where: { id: candidate.id },
      data: {
        password_hash: newPasswordHash,
        password_reset_token_hash: null,
        password_reset_expires_at: null,
        updated_at: toISOStringSafe(new Date()),
      },
    });

    await MyGlobal.prisma.community_bbs_communitymember_sessions.updateMany({
      where: { community_bbs_communitymember_id: candidate.id },
      data: { expired_at: toISOStringSafe(new Date()) },
    });

    const auditId = v4() as string & tags.Format<"uuid">;
    await MyGlobal.prisma.community_bbs_audit_logs.create({
      data: {
        id: auditId,
        actor_type: "community_member",
        actor_id: candidate.id,
        entity: "user",
        action: "password_reset",
        payload: ip ?? null,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    return {
      message:
        "Password changed successfully; please sign in with your new password.",
      reauthenticate: true,
      audit_log_id: auditId,
    };
  }

  throw new HttpException("Invalid or expired token", 400);
}
