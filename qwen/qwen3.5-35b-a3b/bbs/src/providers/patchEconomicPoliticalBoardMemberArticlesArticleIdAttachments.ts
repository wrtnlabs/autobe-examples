import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EconomicPoliticalBoardAttachmentAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardAttachmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardMemberArticlesArticleIdAttachments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardArticle.IManageAttachmentsRequest;
}): Promise<IEconomicPoliticalBoardAttachment.IList> {
  const article =
    await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, author_id: true },
    });
  if (article.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date());
  if (props.body.attachmentIds) {
    for (const attachmentId of props.body.attachmentIds) {
      await MyGlobal.prisma.economic_political_board_attachments.delete({
        where: { id: attachmentId },
      });
    }
  }
  if (props.body.attachments) {
    for (const attachment of props.body.attachments) {
      await MyGlobal.prisma.economic_political_board_attachments.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          article_id: props.articleId,
          file_url: attachment.file_url,
          file_name: attachment.file_name,
          file_type: attachment.file_type,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
  }
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.economic_political_board_attachments.findMany({
      where: { article_id: props.articleId, deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EconomicPoliticalBoardAttachmentAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.economic_political_board_attachments.count({
      where: { article_id: props.articleId, deleted_at: null },
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicPoliticalBoardAttachmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
