import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { adminId, sessionId } = props;

  const session =
    await MyGlobal.prisma.reddit_community_admin_sessions.findFirst({
      where: {
        id: sessionId,
        reddit_community_admin_id: adminId,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  await MyGlobal.prisma.reddit_community_admin_sessions.delete({
    where: {
      id: sessionId,
    },
  });
}
