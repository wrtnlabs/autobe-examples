import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function deleteCommunityBbsCommunityMemberCommunityMembersUsernamePushTokensPushTokenId(props: {
  communityMember: CommunitymemberPayload;
  username: string;
  pushTokenId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { communityMember, username, pushTokenId } = props;

  // Resolve the target community member by username
  const member = await MyGlobal.prisma.community_bbs_communitymember.findUnique(
    {
      where: { username },
    },
  );
  if (!member) throw new HttpException("Not Found", 404);

  // Resolve the push token by id
  const token = await MyGlobal.prisma.community_bbs_push_tokens.findUnique({
    where: { id: pushTokenId },
  });

  // If token is missing or not owned by the resolved member, treat as not found
  if (!token || token.community_member_id !== member.id) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: only the token owner (or an admin) may revoke the token.
  // Props only include communityMember actor; enforce ownership.
  if (communityMember.id !== member.id) {
    throw new HttpException(
      "Unauthorized: Only the token owner or an administrator may revoke this token",
      403,
    );
  }

  // Idempotency: if already revoked or soft-deleted, nothing to do
  if (token.revoked === true || token.deleted_at) return;

  // Prepare timestamp once and reuse
  const now = toISOStringSafe(new Date());

  // Soft-delete/revoke the token (reversible by clearing revoked and deleted_at)
  await MyGlobal.prisma.community_bbs_push_tokens.update({
    where: { id: pushTokenId },
    data: {
      revoked: true,
      deleted_at: now,
    },
  });

  // Record an audit log entry for the revocation. Do NOT store the raw token value.
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      target_user_id: member.id,
      actor_type: "community_member",
      actor_id: communityMember.id,
      entity: "push_token",
      action: "revoke",
      payload: JSON.stringify({ pushTokenId, username }),
      created_at: now,
      updated_at: now,
    },
  });

  return;
}
