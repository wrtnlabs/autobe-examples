import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardArticleDraftTransformer } from "../transformers/DiscussionBoardArticleDraftTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminArticlesDraftsDraftId(props: {
  superAdmin: SuperAdminPayload;
  draftId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleDraft.IUpdate;
}): Promise<IDiscussionBoardArticleDraft> {
  // Validate draft exists
  await MyGlobal.prisma.discussion_board_article_drafts.findUniqueOrThrow({
    where: { id: props.draftId },
  });
  // Get current timestamp for updates
  const now = new Date().toISOString();
  // Prepare update data with conditional field updates
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
  // Perform update with transformer select
  const updatedDraft =
    await MyGlobal.prisma.discussion_board_article_drafts.update({
      where: { id: props.draftId },
      data: updateData,
      ...DiscussionBoardArticleDraftTransformer.select(),
    });
  // Transform and return using transformer
  return DiscussionBoardArticleDraftTransformer.transform(updatedDraft);
}
