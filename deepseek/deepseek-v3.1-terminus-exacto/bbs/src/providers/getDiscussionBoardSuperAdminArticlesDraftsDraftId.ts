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

export async function getDiscussionBoardSuperAdminArticlesDraftsDraftId(props: {
  superAdmin: SuperAdminPayload;
  draftId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleDraft> {
  const draft =
    await MyGlobal.prisma.discussion_board_article_drafts.findUniqueOrThrow({
      where: { id: props.draftId },
      ...DiscussionBoardArticleDraftTransformer.select(),
    });
  return await DiscussionBoardArticleDraftTransformer.transform(draft);
}
