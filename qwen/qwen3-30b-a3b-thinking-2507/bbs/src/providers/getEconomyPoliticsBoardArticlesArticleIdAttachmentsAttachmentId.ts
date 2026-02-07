import { IEconomyPoliticsBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardArticleAttachmentTransformer } from "../transformers/EconomyPoliticsBoardArticleAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomyPoliticsBoardArticlesArticleIdAttachmentsAttachmentId(props: {
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IEconomyPoliticsBoardArticleAttachment> {
  const attachment =
    await MyGlobal.prisma.economy_politics_board_article_attachments.findUnique(
      {
        where: {
          id: props.attachmentId,
          economy_politics_board_article_id: props.articleId,
        },
        ...EconomyPoliticsBoardArticleAttachmentTransformer.select(),
      },
    );
  if (!attachment) throw new HttpException("Attachment not found", 404);
  return await EconomyPoliticsBoardArticleAttachmentTransformer.transform(
    attachment,
  );
}
