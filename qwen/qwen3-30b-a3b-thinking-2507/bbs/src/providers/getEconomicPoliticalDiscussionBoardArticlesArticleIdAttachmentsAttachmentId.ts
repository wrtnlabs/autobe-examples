import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardAttachmentTransformer } from "../transformers/EconomicPoliticalDiscussionBoardAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalDiscussionBoardArticlesArticleIdAttachmentsAttachmentId(props: {
  articleId: string;
  attachmentId: string;
}): Promise<IEconomicPoliticalDiscussionBoardAttachment> {
  const attachment =
    await MyGlobal.prisma.economic_political_discussion_board_attachments.findUniqueOrThrow(
      {
        where: {
          id: props.attachmentId,
          article_id: props.articleId,
          deleted_at: null,
        },
        ...EconomicPoliticalDiscussionBoardAttachmentTransformer.select(),
      },
    );
  return await EconomicPoliticalDiscussionBoardAttachmentTransformer.transform(
    attachment,
  );
}
