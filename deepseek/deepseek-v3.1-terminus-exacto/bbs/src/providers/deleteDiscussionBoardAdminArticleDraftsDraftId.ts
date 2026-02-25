import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminArticleDraftsDraftId(props: {
  admin: AdminPayload;
  draftId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if draft exists and is not already deleted
  const draft =
    await MyGlobal.prisma.discussion_board_article_drafts.findUnique({
      where: { id: props.draftId },
    });
  if (!draft) {
    throw new HttpException("Article draft not found", 404);
  }
  if (draft.draft_deleted_at !== null) {
    throw new HttpException("Article draft already deleted", 400);
  }
  // Generate current ISO timestamp without using Date
  const currentTimestamp = `${new Date().toISOString()}` as string &
    tags.Format<"date-time">;
  // Perform soft deletion - admins can delete any content regardless of ownership
  await MyGlobal.prisma.discussion_board_article_drafts.update({
    where: { id: props.draftId },
    data: {
      draft_deleted_at: currentTimestamp,
    },
  });
}
