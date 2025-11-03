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

export async function postAuthCommunityMemberSessionsRevoke(props: {
  communityMember: CommunitymemberPayload;
  body: ICommunityBbsCommunityMember.ISessionRevoke;
}): Promise<ICommunityBbsCommunityMember.ISessionRevokeResponse> {
  const { communityMember, body } = props;

  // Prepare timestamp for revoked_at and audit entries
  const now = toISOStringSafe(new Date());

  // Helper to create branded uuid array
  const toBrandedUuidArray = (ids: string[]) =>
    ids.map((id) => id as string & tags.Format<"uuid">);

  if (body.mode === "by_ids") {
    // Business: ensure ownership of all requested session ids
    const requestedIds = body.session_ids;

    const ownedSessions =
      await MyGlobal.prisma.community_bbs_communitymember_sessions.findMany({
        where: {
          id: { in: requestedIds },
          community_bbs_communitymember_id: communityMember.id,
        },
        select: { id: true },
      });

    if (ownedSessions.length !== requestedIds.length) {
      throw new HttpException(
        "One or more sessions not found or not owned",
        404,
      );
    }

    const idsToRevoke = ownedSessions.map((s) => s.id);

    // Revoke by setting expired_at to now
    const updateResult =
      await MyGlobal.prisma.community_bbs_communitymember_sessions.updateMany({
        where: {
          id: { in: idsToRevoke },
          community_bbs_communitymember_id: communityMember.id,
          // Only update active sessions
          expired_at: null,
        },
        data: {
          expired_at: now,
        },
      });

    // Create audit log entries for each revoked session
    const auditEntries = idsToRevoke.map((id) => ({
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "communityMember",
      actor_id: communityMember.id,
      entity: "session",
      action: "revoke",
      payload: JSON.stringify({ session_id: id, reason: body.reason ?? null }),
      created_at: now,
      updated_at: now,
    }));

    if (auditEntries.length > 0) {
      await MyGlobal.prisma.community_bbs_audit_logs.createMany({
        data: auditEntries,
      });
    }

    const revokedCount = Number(updateResult.count) as number &
      tags.Type<"int32"> &
      tags.Minimum<0>;

    return {
      revoked_session_ids: toBrandedUuidArray(idsToRevoke),
      revoked_count: revokedCount,
      revoked_all: false,
      message: `Revoked ${Number(updateResult.count)} session(s).`,
    };
  }

  // mode === 'all'
  // Find currently active sessions for the member
  const activeSessions =
    await MyGlobal.prisma.community_bbs_communitymember_sessions.findMany({
      where: {
        community_bbs_communitymember_id: communityMember.id,
        expired_at: null,
      },
      select: { id: true },
    });

  const idsToRevokeAll = activeSessions.map((s) => s.id);

  let updatedCount = 0;
  if (idsToRevokeAll.length > 0) {
    const updateAll =
      await MyGlobal.prisma.community_bbs_communitymember_sessions.updateMany({
        where: { id: { in: idsToRevokeAll } },
        data: { expired_at: now },
      });
    updatedCount = updateAll.count;
  }

  // Create a single audit entry summarizing the global revoke
  const audit = {
    id: v4() as string & tags.Format<"uuid">,
    actor_type: "communityMember",
    actor_id: communityMember.id,
    entity: "session",
    action: "revoke_all",
    payload: JSON.stringify({
      revoked_count: updatedCount,
      reason:
        (body as ICommunityBbsCommunityMember.ISessionRevoke.IAll).reason ??
        null,
    }),
    created_at: now,
    updated_at: now,
  };

  await MyGlobal.prisma.community_bbs_audit_logs.create({ data: audit });

  const revokedCountAll = Number(updatedCount) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  return {
    revoked_session_ids: toBrandedUuidArray(idsToRevokeAll),
    revoked_count: revokedCountAll,
    revoked_all: true,
    message: `Revoked ${updatedCount} session(s) for the member.`,
  };
}
