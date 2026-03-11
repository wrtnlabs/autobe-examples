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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EconomicPoliticalBoardAttachmentAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardAttachmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardMemberArticlesArticleIdAttachments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardAttachment.IManage;
}): Promise<IPageIEconomicPoliticalBoardAttachment.ISummary> {
  // Step 1: Verify article exists
  const article =
    await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Step 2: Check member exists and get role
  const memberRole =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findUniqueOrThrow(
      {
        where: { id: props.member.id },
      },
    );
  // Step 3: Check authorization - article author OR admin
  const isAuthor = article.author_id === props.member.id;
  const isAdmin =
    memberRole.grade === "regular" || memberRole.grade === "super";
  if (!isAuthor && !isAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  // Step 4: Validate operations array
  if (!Array.isArray(props.body.operations)) {
    throw new HttpException("Operations must be an array", 400);
  }
  // Step 5: Process operations within transaction for atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const operation of props.body.operations) {
      if (operation.action === "add") {
        // Validate required fields
        if (
          operation.fileUrl === undefined ||
          operation.fileName === undefined ||
          operation.fileType === undefined
        ) {
          throw new HttpException(
            "Missing required fields for add operation",
            400,
          );
        }
        // Validate file type
        if (operation.fileType !== "image" && operation.fileType !== "file") {
          throw new HttpException("Invalid file type", 400);
        }
        await tx.economic_political_board_attachments.create({
          data: {
            id: v4(),
            article_id: props.articleId,
            file_url: operation.fileUrl,
            file_name: operation.fileName,
            file_type: operation.fileType,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
      } else if (operation.action === "remove") {
        // Soft delete attachment with ownership check
        if (operation.attachmentId === undefined) {
          throw new HttpException(
            "Missing attachmentId for remove operation",
            400,
          );
        }
        await tx.economic_political_board_attachments.update({
          where: {
            id: operation.attachmentId,
            article_id: props.articleId,
          },
          data: {
            deleted_at: now,
            updated_at: now,
          },
        });
      } else {
        throw new HttpException("Invalid operation action", 400);
      }
    }
  });
  // Step 6: Validate pagination parameters (use defaults, IManage has no pagination)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Step 7: Query remaining active attachments
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_political_board_attachments.findMany({
      where: {
        article_id: props.articleId,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EconomicPoliticalBoardAttachmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.economic_political_board_attachments.count({
      where: {
        article_id: props.articleId,
        deleted_at: null,
      },
    }),
  ]);
  // Step 8: Transform and return paginated response
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
