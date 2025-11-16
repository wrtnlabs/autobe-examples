import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerator.IUpdate;
}): Promise<IDiscussionBoardModerator.ISummary> {
  const existing = await MyGlobal.prisma.discussion_board_moderators.findUnique(
    {
      where: { id: props.moderatorId },
    },
  );

  if (!existing) {
    throw new HttpException("Moderator not found", 404);
  }

  if (existing.id !== props.moderator.id) {
    throw new HttpException(
      "Forbidden: You can only update your own profile",
      403,
    );
  }

  const updated = await MyGlobal.prisma.discussion_board_moderators.update({
    where: { id: props.moderatorId },
    data: {
      ...(props.body.username !== undefined && {
        username: props.body.username,
      }),
      ...(props.body.email !== undefined && { email: props.body.email }),
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
