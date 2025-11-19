import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorPasswordResetsResetId(props: {
  moderator: ModeratorPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardPasswordReset> {
  const resetRequest =
    await MyGlobal.prisma.discussion_board_password_resets.findUnique({
      where: {
        id: props.resetId,
      },
    });

  if (!resetRequest) {
    throw new HttpException("Password reset request not found", 404);
  }

  return {
    id: resetRequest.id,
    actor_type: typia.assert<"member" | "moderator">(resetRequest.actor_type),
    token: resetRequest.token,
    email: resetRequest.email,
    expires_at: toISOStringSafe(resetRequest.expires_at),
    used_at:
      resetRequest.used_at === null
        ? null
        : toISOStringSafe(resetRequest.used_at),
    created_at: toISOStringSafe(resetRequest.created_at),
  };
}
