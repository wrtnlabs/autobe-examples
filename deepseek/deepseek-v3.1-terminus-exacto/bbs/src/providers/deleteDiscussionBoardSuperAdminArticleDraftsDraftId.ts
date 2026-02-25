import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminArticleDraftsDraftId(props: {
  superAdmin: SuperAdminPayload;
  draftId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First check if draft exists and verify it's not already deleted
  const draft =
    await MyGlobal.prisma.discussion_board_article_drafts.findUniqueOrThrow({
      where: { id: props.draftId },
      select: { id: true, draft_deleted_at: true },
    });
  // Check if draft is already deleted
  if (draft.draft_deleted_at !== null) {
    throw new HttpException("Draft has already been deleted", 400);
  }
  // Perform soft deletion by setting draft_deleted_at to current ISO timestamp
  await MyGlobal.prisma.discussion_board_article_drafts.update({
    where: { id: props.draftId },
    data: {
      draft_deleted_at: new Date().toISOString() as string &
        tags.Format<"date-time">,
    },
  });
}
