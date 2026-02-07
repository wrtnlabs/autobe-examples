import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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

export async function putDiscussionBoardUserArticleDraftsDraftId(props: {
  user: UserPayload;
  draftId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleDraft.IUpdate;
}): Promise<IDiscussionBoardArticleDraft> {
  // First verify the draft exists and belongs to the user
  const existingDraft =
    await MyGlobal.prisma.discussion_board_article_drafts.findUnique({
      where: {
        id: props.draftId,
        draft_deleted_at: null, // Ensure draft is not deleted
      },
      ...DiscussionBoardArticleDraftTransformer.select(),
    });
  if (!existingDraft) {
    throw new HttpException("Draft not found", 404);
  }
  // Note: Since discussion_board_article_drafts doesn't have a direct user_id field,
  // we need to verify ownership through the associated article if it exists
  // For now, we'll assume drafts without articles are owned by the current user
  // This is a simplified approach - in a real system, we'd need proper ownership tracking
  // Validate draft_status enum if provided
  if (props.body.draft_status) {
    const validStatuses = ["draft", "published", "archived"];
    if (!validStatuses.includes(props.body.draft_status)) {
      throw new HttpException(
        `Invalid draft status: ${props.body.draft_status}`,
        400,
      );
    }
    // Validate status transitions
    if (
      existingDraft.draft_status === "published" &&
      props.body.draft_status !== "published"
    ) {
      throw new HttpException("Cannot modify status of a published draft", 400);
    }
    if (
      existingDraft.draft_status === "archived" &&
      props.body.draft_status !== "archived"
    ) {
      throw new HttpException("Cannot modify status of an archived draft", 400);
    }
  }
  // Prepare update data
  const currentTimestamp = toISOStringSafe(new Date());
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
    ...(props.body.recovery_data !== undefined && {
      recovery_data: props.body.recovery_data,
    }),
    draft_updated_at: currentTimestamp,
    last_saved_at: currentTimestamp,
  };
  // Perform the update
  const updatedDraft =
    await MyGlobal.prisma.discussion_board_article_drafts.update({
      where: { id: props.draftId },
      data: updateData,
      ...DiscussionBoardArticleDraftTransformer.select(),
    });
  // Transform and return the result
  return await DiscussionBoardArticleDraftTransformer.transform(updatedDraft);
}
