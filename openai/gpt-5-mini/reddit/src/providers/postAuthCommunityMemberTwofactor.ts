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

export async function postAuthCommunityMemberTwofactor(props: {
  communityMember: CommunitymemberPayload;
  body: ICommunityBbsCommunityMember.IManageMfa;
}): Promise<ICommunityBbsCommunityMember.IMfaStatus> {
  const { communityMember, body } = props;

  // Load member and enforce ownership
  const member =
    await MyGlobal.prisma.community_bbs_communitymember.findUniqueOrThrow({
      where: { id: communityMember.id },
    });

  if (member.id !== communityMember.id) {
    throw new HttpException("Unauthorized", 403);
  }

  // Prepare timestamp once
  const now = toISOStringSafe(new Date());

  if (body.action === "enable") {
    // Enable MFA: no runtime type validation of OTP code (controller already validated structure)
    const updated = await MyGlobal.prisma.community_bbs_communitymember.update({
      where: { id: communityMember.id },
      data: {
        mfa_enabled: true,
        updated_at: now,
      },
    });

    // Invalidate existing sessions to force re-authentication
    await MyGlobal.prisma.community_bbs_communitymember_sessions.deleteMany({
      where: { community_bbs_communitymember_id: communityMember.id },
    });

    // Record audit log
    await MyGlobal.prisma.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "community_member",
        actor_id: communityMember.id,
        entity: "community_member",
        action: "mfa.enable",
        payload: body.otp_code ?? null,
        target_user_id: communityMember.id,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: updated.id as string & tags.Format<"uuid">,
      mfa_enabled: updated.mfa_enabled,
      updated_at: toISOStringSafe(updated.updated_at),
    };
  }

  // action === 'disable'
  // Verify password (business-level check)
  const verified = await PasswordUtil.verify(
    body.password,
    member.password_hash,
  );
  if (!verified) {
    throw new HttpException("Unauthorized: invalid password", 403);
  }

  const updated = await MyGlobal.prisma.community_bbs_communitymember.update({
    where: { id: communityMember.id },
    data: {
      mfa_enabled: false,
      updated_at: now,
    },
  });

  // Invalidate existing sessions to enforce re-authentication
  await MyGlobal.prisma.community_bbs_communitymember_sessions.deleteMany({
    where: { community_bbs_communitymember_id: communityMember.id },
  });

  // Record audit log
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "community_member",
      actor_id: communityMember.id,
      entity: "community_member",
      action: "mfa.disable",
      payload: null,
      target_user_id: communityMember.id,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    mfa_enabled: updated.mfa_enabled,
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
