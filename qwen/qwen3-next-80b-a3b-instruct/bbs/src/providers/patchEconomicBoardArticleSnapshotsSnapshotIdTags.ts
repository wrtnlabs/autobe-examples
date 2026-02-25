import { IEconomicBoardArticleSnapshotTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleSnapshotTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardArticleSnapshotTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleSnapshotTag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardArticleSnapshotsSnapshotIdTags(props: {
  snapshotId: string & tags.Format<"uuid">;
  body: IEconomicBoardArticleSnapshotTag.IRequest;
}): Promise<IPageIEconomicBoardArticleSnapshotTag.ISummary> {
  const { tag, page = 1, limit = 50 } = props.body;
  // Validate and clamp pagination parameters
  const adjustedPage = Math.max(1, page);
  const adjustedLimit = Math.min(Math.max(limit, 1), 100);
  const offset = (adjustedPage - 1) * adjustedLimit;
  // Verify snapshot exists
  await MyGlobal.prisma.economic_board_article_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId },
  });
  // Build where conditions
  const where: Prisma.economic_board_article_snapshot_tagsWhereInput = {
    economic_board_article_snapshot_id: props.snapshotId,
    economic_board_tag_id: {},
  };
  // If tag filter provided, fetch only IDs that match the tag in economic_board_tags table
  if (tag && tag.length > 0) {
    const tagIds = await MyGlobal.prisma.economic_board_tags.findMany({
      where: {
        tag: {
          in: tag,
        },
      },
      select: { id: true },
    });
    where.economic_board_tag_id = {
      in: tagIds.map((t) => t.id),
    };
  }
  // Fetch tagged records
  const data =
    await MyGlobal.prisma.economic_board_article_snapshot_tags.findMany({
      where,
      skip: offset,
      take: adjustedLimit,
      orderBy: {
        created_at: "desc",
      },
      select: {
        created_at: true,
        economic_board_tag_id: true,
      },
    });
  // Transform to ISummary format (string & format<'date-time'>)
  const transformedData = await Promise.all(
    data.map(async (item) => {
      const tagRecord = await MyGlobal.prisma.economic_board_tags.findUnique({
        where: { id: item.economic_board_tag_id },
      });
      return {
        tag: (tagRecord?.tag ?? "") satisfies string as string &
          tags.MinLength<1> &
          tags.MaxLength<50>,
        created_at: toISOStringSafe(item.created_at) as string &
          tags.Format<"date-time">,
      };
    }),
  );
  // Count total matching records
  const total =
    await MyGlobal.prisma.economic_board_article_snapshot_tags.count({
      where,
    });
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: adjustedPage,
      limit: adjustedLimit,
      records: total,
      pages: Math.ceil(total / adjustedLimit),
    } satisfies IPage.IPagination,
  };
}
