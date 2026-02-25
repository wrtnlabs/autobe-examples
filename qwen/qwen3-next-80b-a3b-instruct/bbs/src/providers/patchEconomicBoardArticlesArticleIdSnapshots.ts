import { IEconomicBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardArticleSnapshotAtSummaryTransformer } from "../transformers/EconomicBoardArticleSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardArticlesArticleIdSnapshots(props: {
  articleId: string & tags.Format<"uuid">;
  body: IEconomicBoardArticleSnapshot.IRequest;
}): Promise<IPageIEconomicBoardArticleSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.economic_board_article_snapshotsWhereInput = {
    article_id: props.articleId,
    ...(props.body.snapshot_reason && {
      snapshot_reason: props.body.snapshot_reason,
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: props.body.created_at_to },
    }),
  } satisfies Prisma.economic_board_article_snapshotsWhereInput;
  const data = await MyGlobal.prisma.economic_board_article_snapshots.findMany({
    where: whereClause,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    ...EconomicBoardArticleSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.economic_board_article_snapshots.count({
    where: whereClause,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicBoardArticleSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEconomicBoardArticleSnapshot.ISummary;
}
