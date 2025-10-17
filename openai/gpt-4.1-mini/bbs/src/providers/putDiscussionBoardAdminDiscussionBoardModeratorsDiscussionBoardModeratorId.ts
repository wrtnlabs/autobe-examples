import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminDiscussionBoardModeratorsDiscussionBoardModeratorId(props: {
  admin: AdminPayload;
  discussionBoardModeratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerator.IUpdate;
}): Promise<IDiscussionBoardModerator> {
  const { admin, discussionBoardModeratorId, body } = props;

  const existing = await MyGlobal.prisma.discussion_board_moderators.findUnique(
    {
      where: { id: discussionBoardModeratorId },
    },
  );

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Discussion board moderator not found", 404);
  }

  const updateDataPartial: Partial<{
    email: string | undefined;
    display_name: string | undefined;
    updated_at: string & tags.Format<"date-time">;
    password_hash?: string;
  }> = {
    email: body.email ?? undefined,
    display_name: body.display_name ?? undefined,
    updated_at: toISOStringSafe(new Date()),
  };

  if (body.password !== undefined) {
    updateDataPartial.password_hash = await PasswordUtil.hash(body.password);
  }

  const updated = await MyGlobal.prisma.discussion_board_moderators.update({
    where: { id: discussionBoardModeratorId },
    data: updateDataPartial,
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    display_name: updated.display_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
