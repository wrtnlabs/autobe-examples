import { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleAttachment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardArticleAttachmentAtSumTransformer } from "../transformers/EconomicBoardArticleAttachmentAtSumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardArticleSnapshotsSnapshotIdAttachments(props: {
  snapshotId: string & tags.Format<"uuid">;
  body: IEconomicBoardArticleAttachment.IRequest;
}): Promise<IPageIEconomicBoardArticleAttachment.ISum> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "desc";
  // Find attachment IDs linked to this snapshot
  const snapshotAttachments =
    await MyGlobal.prisma.economic_board_article_snapshot_attachments.findMany({
      where: { article_snapshot_id: props.snapshotId },
      select: { article_attachment_id: true },
    });
  // Extract attachment IDs
  const attachmentIds = snapshotAttachments.map(
    (sa) => sa.article_attachment_id,
  );
  // If no attachments exist, return empty page
  if (attachmentIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Query economic_board_article_attachments with complete select matching ISum
  const data =
    await MyGlobal.prisma.economic_board_article_attachments.findMany({
      where: {
        id: { in: attachmentIds },
      },
      skip,
      take: limit,
      orderBy: {
        created_at: sort === "asc" ? "asc" : "desc",
      },
      select: {
        id: true,
        file_url: true,
        file_name: true,
        file_type: true,
        file_size: true,
        created_at: true,
        updated_at: true,
        article: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            section_id: true,
            author_id: true,
            title: true,
            content: true,
            is_deleted: true,
          },
        },
        snapshotAttachments: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            article_snapshot_id: true,
            article_attachment_id: true,
          },
          where: {
            article_attachment_id: { in: attachmentIds },
          },
        },
      },
    });
  // Count total matching attachments
  const total = await MyGlobal.prisma.economic_board_article_attachments.count({
    where: {
      id: { in: attachmentIds },
    },
  });
  // Transform each record using transformer (now compatible with full structure)
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicBoardArticleAttachmentAtSumTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
