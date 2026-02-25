import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleDraftTransformer } from "../transformers/DiscussionBoardArticleDraftTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserArticlesDraftsDraftId(props: {
  user: UserPayload;
  draftId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleDraft.IUpdate;
}): Promise<IDiscussionBoardArticleDraft> {
  // Verify draft exists and is not deleted
  const existing =
    await MyGlobal.prisma.discussion_board_article_drafts.findFirstOrThrow({
      where: {
        id: props.draftId,
        draft_deleted_at: null,
      },
      select: {
        id: true,
        draft_status: true,
        draft_title: true,
        draft_content: true,
        discussion_board_article_id: true,
      },
    });
  // Validate publication requirements if status is changing to published
  if (
    props.body.draft_status === "published" &&
    existing.draft_status !== "published"
  ) {
    // Check if draft is already associated with an article (already published)
    if (existing.discussion_board_article_id !== null) {
      throw new HttpException("Draft is already published", 400);
    }
    // Check if we have required fields for publication
    const titleToUse = props.body.draft_title ?? existing.draft_title;
    const contentToUse = props.body.draft_content ?? existing.draft_content;
    if (!titleToUse?.trim()) {
      throw new HttpException("Title is required for publication", 400);
    }
    if (!contentToUse?.trim()) {
      throw new HttpException("Content is required for publication", 400);
    }
  }
  // Validate status transitions
  if (
    existing.draft_status === "archived" &&
    props.body.draft_status !== "archived"
  ) {
    throw new HttpException("Cannot modify archived drafts", 400);
  }
  const now = new Date();
  // Prepare update data with proper validation
  const updateData: Prisma.discussion_board_article_draftsUpdateInput = {
    ...(props.body.draft_title !== undefined && {
      draft_title: props.body.draft_title,
    }),
    ...(props.body.draft_content !== undefined && {
      draft_content: props.body.draft_content,
    }),
    ...(props.body.draft_status !== undefined && {
      draft_status: props.body.draft_status,
    }),
    last_saved_at: now,
    draft_updated_at: now,
  };
  // Perform update
  await MyGlobal.prisma.discussion_board_article_drafts.update({
    where: { id: props.draftId },
    data: updateData,
  });
  // Retrieve updated draft with transformer
  const updated =
    await MyGlobal.prisma.discussion_board_article_drafts.findUniqueOrThrow({
      where: { id: props.draftId },
      ...DiscussionBoardArticleDraftTransformer.select(),
    });
  return await DiscussionBoardArticleDraftTransformer.transform(updated);
}
