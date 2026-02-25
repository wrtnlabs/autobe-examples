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

export async function getDiscussionBoardUserArticlesDraftsDraftId(props: {
  user: UserPayload;
  draftId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleDraft> {
  const draft =
    await MyGlobal.prisma.discussion_board_article_drafts.findUniqueOrThrow({
      where: {
        id: props.draftId,
        draft_deleted_at: null,
      },
      ...DiscussionBoardArticleDraftTransformer.select(),
    });
  return await DiscussionBoardArticleDraftTransformer.transform(draft);
}
