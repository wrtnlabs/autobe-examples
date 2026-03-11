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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EconomicPoliticalBoardAttachmentTransformer } from "../transformers/EconomicPoliticalBoardAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalBoardMemberArticlesArticleIdAttachments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardAttachment.ICreate;
}): Promise<IEconomicPoliticalBoardAttachment> {
  const article =
    await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, author_id: true },
    });
  if (article.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const created =
    await MyGlobal.prisma.economic_political_board_attachments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        article_id: props.articleId,
        file_url: props.body.file_url,
        file_name: props.body.file_name,
        file_type: props.body.file_type,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...EconomicPoliticalBoardAttachmentTransformer.select(),
    });
  return await EconomicPoliticalBoardAttachmentTransformer.transform(created);
}
