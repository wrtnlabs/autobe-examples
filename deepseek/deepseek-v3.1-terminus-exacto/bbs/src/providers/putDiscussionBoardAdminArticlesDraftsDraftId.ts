import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleDraftTransformer } from "../transformers/DiscussionBoardArticleDraftTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminArticlesDraftsDraftId(props: {
  admin: AdminPayload;
  draftId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleDraft.IUpdate;
}): Promise<IDiscussionBoardArticleDraft> {
  // Verify draft exists and is not deleted
  const draft =
    await MyGlobal.prisma.discussion_board_article_drafts.findUniqueOrThrow({
      where: {
        id: props.draftId,
        draft_deleted_at: null,
      },
    });
  // Validate publishing transition if status is being changed to 'published'
  if (
    props.body.draft_status !== undefined &&
    props.body.draft_status === "published"
  ) {
    if (!draft.draft_title || !draft.draft_content) {
      throw new HttpException(
        "Cannot publish draft without title and content",
        400,
      );
    }
  }
  // Prepare update data with conditional updates - using Prisma's timestamp handling
  const now = await MyGlobal.prisma.$queryRaw`SELECT CURRENT_TIMESTAMP as now`;
  const currentTimestamp = (now as any)[0].now;
  const updateData = {
    ...(props.body.draft_title !== undefined && {
      draft_title: props.body.draft_title,
    }),
    ...(props.body.draft_content !== undefined && {
      draft_content: props.body.draft_content,
    }),
    ...(props.body.draft_status !== undefined && {
      draft_status: props.body.draft_status,
    }),
    last_saved_at: currentTimestamp,
    draft_updated_at: currentTimestamp,
  };
  // Update the draft
  await MyGlobal.prisma.discussion_board_article_drafts.update({
    where: { id: props.draftId },
    data: updateData,
  });
  // Fetch updated draft with transformer
  const updatedDraft =
    await MyGlobal.prisma.discussion_board_article_drafts.findUniqueOrThrow({
      where: { id: props.draftId },
      ...DiscussionBoardArticleDraftTransformer.select(),
    });
  return await DiscussionBoardArticleDraftTransformer.transform(updatedDraft);
}
