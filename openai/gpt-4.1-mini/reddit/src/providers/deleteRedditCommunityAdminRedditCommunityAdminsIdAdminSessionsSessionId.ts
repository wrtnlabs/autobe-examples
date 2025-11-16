import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminRedditCommunityAdminsIdAdminSessionsSessionId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.reddit_community_admin_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (!existing || existing.reddit_community_admin_id !== props.id) {
    throw new HttpException("Admin session not found", 404);
  }

  await MyGlobal.prisma.reddit_community_admin_sessions.delete({
    where: { id: props.sessionId },
  });
}
