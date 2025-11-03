import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuth";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorAuthLogout(props: {
  moderator: ModeratorPayload;
}): Promise<IDiscussionBoardAuth.ILogoutResult> {
  const { moderator } = props;

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_moderator_sessions.update({
    where: { id: moderator.session_id },
    data: { expired_at: now },
  });

  return {
    success: true,
    message: "Logout successful",
  };
}
