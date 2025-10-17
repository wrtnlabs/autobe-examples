import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorLogout(props: {
  moderator: ModeratorPayload;
}): Promise<IRedditLikeModerator.ILogoutConfirmation> {
  const { moderator } = props;

  const session = await MyGlobal.prisma.reddit_like_sessions.findFirst({
    where: {
      reddit_like_user_id: moderator.id,
      deleted_at: null,
    },
    orderBy: {
      last_activity_at: "desc",
    },
  });

  if (!session) {
    throw new HttpException("No active session found", 404);
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.reddit_like_sessions.update({
    where: {
      id: session.id,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  return {
    success: true,
    message: "Successfully logged out. Your session has been invalidated.",
  };
}
