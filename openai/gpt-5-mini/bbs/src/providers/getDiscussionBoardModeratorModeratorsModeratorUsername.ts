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

export async function getDiscussionBoardModeratorModeratorsModeratorUsername(props: {
  moderator: ModeratorPayload;
  moderatorUsername: string;
}): Promise<IDiscussionBoardModerator.ISummary> {
  const { moderator, moderatorUsername } = props;

  const caller = await MyGlobal.prisma.discussion_board_moderator.findUnique({
    where: { id: moderator.id },
    select: { id: true, deleted_at: true },
  });

  if (!caller || caller.deleted_at !== null) {
    throw new HttpException("Unauthorized: moderator account not active", 403);
  }

  const record = await MyGlobal.prisma.discussion_board_moderator.findUnique({
    where: { username: moderatorUsername },
    select: {
      id: true,
      username: true,
      display_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!record) {
    throw new HttpException("Not Found", 404);
  }

  try {
    return {
      id: record.id as string & tags.Format<"uuid">,
      username: record.username,
      display_name: record.display_name ?? null,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    };
  } catch (err) {
    const correlation = v4();
    throw new HttpException(`Internal Server Error: ${correlation}`, 500);
  }
}
