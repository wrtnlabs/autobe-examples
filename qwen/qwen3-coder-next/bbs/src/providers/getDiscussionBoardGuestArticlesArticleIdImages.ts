import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardGuestArticlesArticleIdImages(props: {
  guest: GuestPayload;
  articleId: string;
}): Promise<IPageIDiscussionBoardArticleImage.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.discussion_board_article_images.findMany({
    where: {
      discussion_board_article_id: props.articleId,
    },
    skip,
    take: limit,
    orderBy: { display_order: "asc" },
    select: {
      id: true,
      original_filename: true,
      stored_filename: true,
      mime_type: true,
      size: true,
      width: true,
      height: true,
      display_order: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_article_images.count({
    where: {
      discussion_board_article_id: props.articleId,
    },
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      original_filename: record.original_filename,
      stored_filename: record.stored_filename,
      mime_type: record.mime_type,
      size: record.size,
      width: record.width,
      height: record.height,
      display_order: record.display_order,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
