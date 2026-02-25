import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardTags(props: {
  body: IDiscussionBoardTag.IRequest;
}): Promise<IPageIDiscussionBoardTag.ISummary> {
  // Validate search query length constraints
  if (props.body.search !== undefined) {
    if (props.body.search.length < 2) {
      throw new HttpException(
        "Search query must be at least 2 characters",
        400,
      );
    }
    if (props.body.search.length > 100) {
      throw new HttpException(
        "Search query must be less than 100 characters",
        400,
      );
    }
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where clause for search filtering
  const where: Prisma.discussion_board_tagsWhereInput = {
    ...(props.body.search !== undefined &&
      props.body.search.length > 0 && {
        tag_name: { contains: props.body.search, mode: "insensitive" },
      }),
  };
  // Determine sort order based on sortBy parameter
  const orderBy: Prisma.discussion_board_tagsOrderByWithRelationInput[] = [];
  if (props.body.sortBy === "articleCount") {
    orderBy.push({
      articles: { _count: "desc" },
    });
  }
  orderBy.push({ created_at: "desc" });
  // Fetch paginated tags with article count
  const data = await MyGlobal.prisma.discussion_board_tags.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      tag_name: true,
      created_at: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.discussion_board_tags.count({ where });
  // Calculate total pages (handle zero case)
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  // Transform to response format with proper typing
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    },
    data: data.map((tag) => ({
      id: tag.id as string & tags.Format<"uuid">,
      tag_name: tag.tag_name,
      created_at: toISOStringSafe(tag.created_at),
    })),
  };
}
