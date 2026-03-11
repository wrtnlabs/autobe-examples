import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAttachment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardAttachmentAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardAttachmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardAdminArticlesArticleIdAttachments(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardAttachment.IUpdateAttachment;
}): Promise<IPageIEconomicPoliticalBoardAttachment.ISummary> {
  // Verify article exists
  const article =
    await MyGlobal.prisma.economic_political_board_articles.findUnique({
      where: { id: props.articleId },
    });
  if (article === null) {
    throw new HttpException("Article not found", 404);
  }
  // Check authorization: admin role allows managing any article
  const administrator =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: {
          id: props.admin.id,
        },
      },
    );
  if (administrator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  // Process operations in transaction for atomicity
  await MyGlobal.prisma.$transaction(
    props.body.operations.map((operation) => {
      if (operation.action === "add") {
        return MyGlobal.prisma.economic_political_board_attachments.create({
          data: {
            id: v4(),
            article: { connect: { id: props.articleId } },
            file_url: operation.fileUrl,
            file_name: operation.fileName,
            file_type: operation.fileType,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
      }
      if (operation.action === "remove") {
        return MyGlobal.prisma.economic_political_board_attachments.updateMany({
          where: {
            id: operation.attachmentId,
            article_id: props.articleId,
          },
          data: {
            deleted_at: now,
          },
        });
      }
      throw new HttpException("Invalid operation", 400);
    }),
  );
  // Query all non-deleted attachments
  const page = 1;
  const limit = 100;
  const data =
    await MyGlobal.prisma.economic_political_board_attachments.findMany({
      where: {
        article_id: props.articleId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      ...EconomicPoliticalBoardAttachmentAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.economic_political_board_attachments.count({
      where: {
        article_id: props.articleId,
        deleted_at: null,
      },
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicPoliticalBoardAttachmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
