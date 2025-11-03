import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdminSession.IUpdate;
}): Promise<ICommunityPlatformAdminSession> {
  if (props.admin.id !== props.adminId) {
    throw new HttpException(
      "Forbidden: You can only update your own session.",
      403,
    );
  }

  const session =
    await MyGlobal.prisma.community_platform_admin_sessions.findFirst({
      where: {
        id: props.sessionId,
        community_platform_admin_id: props.adminId,
      },
    });

  if (!session) {
    throw new HttpException("Session not found.", 404);
  }

  const updated =
    await MyGlobal.prisma.community_platform_admin_sessions.update({
      where: { id: props.sessionId },
      data: {
        referrer: props.body.referrer ?? undefined,
        href: props.body.href ?? undefined,
        expired_at:
          props.body.expired_at === undefined
            ? undefined
            : props.body.expired_at,
      },
    });

  return {
    id: updated.id,
    community_platform_admin_id: updated.community_platform_admin_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at == null
        ? undefined
        : toISOStringSafe(updated.expired_at),
  };
}
