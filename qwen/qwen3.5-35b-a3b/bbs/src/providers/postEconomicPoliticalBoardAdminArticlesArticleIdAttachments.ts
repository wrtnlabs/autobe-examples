import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalBoardAttachmentCollector } from "../collectors/EconomicPoliticalBoardAttachmentCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardAttachmentTransformer } from "../transformers/EconomicPoliticalBoardAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalBoardAdminArticlesArticleIdAttachments(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardAttachment.ICreate;
}): Promise<IEconomicPoliticalBoardAttachment> {
  const article =
    await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, author_id: true },
    });
  if (article.author_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  const created =
    await MyGlobal.prisma.economic_political_board_attachments.create({
      data: await EconomicPoliticalBoardAttachmentCollector.collect({
        body: props.body,
        economicPoliticalBoardArticles: article,
      }),
      ...EconomicPoliticalBoardAttachmentTransformer.select(),
    });
  return await EconomicPoliticalBoardAttachmentTransformer.transform(created);
}
