import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardUserArticleDraftsDraftId(props: {
  user: UserPayload;
  draftId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First check if the draft exists and belongs to this user
  const draft = await MyGlobal.prisma.discussion_board_article_drafts.findFirst(
    {
      where: {
        id: props.draftId,
        draft_deleted_at: null,
      },
      select: {
        id: true,
        draft_status: true,
        article: {
          select: {
            author: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    },
  );
  if (!draft) {
    throw new HttpException("Draft not found", 404);
  }
  // Check if draft belongs to authenticated user
  // Drafts that are not yet published won't have article association
  // For drafts without article association, we need to check ownership differently
  if (draft.article && draft.article.author.id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to delete this draft",
      403,
    );
  }
  // Check if draft is already published
  if (draft.draft_status === "published") {
    throw new HttpException(
      "Cannot delete a published draft. Delete the article instead.",
      400,
    );
  }
  // Perform soft delete
  const currentTime = new Date().toISOString();
  await MyGlobal.prisma.discussion_board_article_drafts.update({
    where: { id: props.draftId },
    data: {
      draft_deleted_at: currentTime,
      draft_updated_at: currentTime,
    },
  });
}
