import { IEconomicBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardArticlesArticleIdImages(props: {
  articleId: string & tags.Format<"uuid">;
  page?: number;
  limit?: number;
}): Promise<IPageIEconomicBoardArticleImage.ISummary> {
  const page = props.page ?? 1;
  const limit = props.limit ?? 30;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.economic_board_article_images.findMany({
    where: {
      economic_board_article_id: props.articleId,
    },
    skip,
    take: limit,
    orderBy: {
      uploaded_at: "asc",
    },
    select: {
      original_filename: true,
      width: true,
      height: true,
      uploaded_at: true,
      thumbnail_path: true,
      medium_path: true,
    },
  });
  const total = await MyGlobal.prisma.economic_board_article_images.count({
    where: {
      economic_board_article_id: props.articleId,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      original_filename: item.original_filename,
      width: item.width,
      height: item.height,
      uploaded_at: toISOStringSafe(item.uploaded_at),
      thumbnail_path: item.thumbnail_path,
      medium_path: item.medium_path,
    })),
  };
}
