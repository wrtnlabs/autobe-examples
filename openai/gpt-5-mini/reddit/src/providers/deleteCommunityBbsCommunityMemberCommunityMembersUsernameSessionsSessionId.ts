import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function deleteCommunityBbsCommunityMemberCommunityMembersUsernameSessionsSessionId(props: {
  communityMember: CommunitymemberPayload;
  username: string;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { communityMember, username, sessionId } = props;

  // STEP 1: Verify the username exists
  const member = await MyGlobal.prisma.community_bbs_communitymember.findUnique(
    {
      where: { username },
    },
  );
  if (!member) throw new HttpException("Not Found", 404);

  // STEP 2: Authorization - only the owning authenticated member may delete their session
  if (member.id !== communityMember.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own sessions",
      403,
    );
  }

  // STEP 3: Verify session exists and belongs to the member
  const session =
    await MyGlobal.prisma.community_bbs_communitymember_sessions.findUnique({
      where: { id: sessionId },
    });
  if (!session || session.community_bbs_communitymember_id !== member.id) {
    throw new HttpException("Not Found", 404);
  }

  // STEP 4: Hard delete the session row (model lacks soft-delete column)
  await MyGlobal.prisma.community_bbs_communitymember_sessions.delete({
    where: { id: sessionId },
  });

  // STEP 5: Audit - record the deletion
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "community_member",
      actor_id: communityMember.id,
      entity: "session",
      action: "erase_session",
      payload: JSON.stringify({ username, sessionId }),
      ip: session.ip ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // STEP 6: Best-effort runtime revocation (refresh tokens, caches, blacklists)
  try {
    // If the application exposes a revocation helper on MyGlobal, call it.
    // Using an any cast locally to access optional runtime helper without
    // introducing a hard dependency on its type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const revoker = (MyGlobal as any).revokeSession;
    if (typeof revoker === "function") await revoker(sessionId);
  } catch {
    // Swallow errors from optional revocation to avoid failing the main flow
  }

  return;
}
