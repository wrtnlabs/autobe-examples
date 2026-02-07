import { IDiscussionBoardSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchIndex";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSearchIndices(props: {
  query?: {
    article_id?: string & tags.Format<"uuid">;
    page?: number & tags.Type<"int32">;
    limit?: number & tags.Type<"int32">;
  };
}): Promise<IPageIDiscussionBoardSearchIndex> {
  const page = (props.query?.page ?? 1) satisfies number as number;
  const limit = (props.query?.limit ?? 50) satisfies number as number;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_search_indicesWhereInput = {
    deleted_at: null,
    ...(props.query?.article_id && { article_id: props.query.article_id }),
  };
  const orderByInput = {
    created_at: "desc" as const,
  };
  const data = await MyGlobal.prisma.discussion_board_search_indices.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
  });
  const total = await MyGlobal.prisma.discussion_board_search_indices.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      article_id: record.article_id as string & tags.Format<"uuid">,
      title: record.title,
      content: record.content,
      title_trgm: record.title_trgm,
      content_trgm: record.content_trgm,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
