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
import { DiscussionBoardTagAtSummaryTransformer } from "../transformers/DiscussionBoardTagAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardTags(props: {
  body: IDiscussionBoardTag.IRequest;
}): Promise<IPageIDiscussionBoardTag.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.discussion_board_tagsWhereInput = {};
  // Search filter (LIKE on name)
  if (props.body.search != null && props.body.search.length > 0) {
    whereInput.name = {
      contains: props.body.search,
    };
  }
  // Date range filters
  if (props.body.createdAfter != null) {
    whereInput.created_at = {
      gte: new Date(props.body.createdAfter),
    };
  }
  if (props.body.createdBefore != null) {
    whereInput.created_at = {
      lte: new Date(props.body.createdBefore),
    };
  }
  // Deletion status filter - by default exclude deleted tags
  if (props.body.includeDeleted !== true) {
    whereInput.deleted_at = null;
  }
  // Build ORDER BY clause - default to created_at desc
  const orderByInput: Prisma.discussion_board_tagsOrderByWithRelationInput =
    props.body.sortBy === "name"
      ? { name: props.body.sortOrder === "asc" ? "asc" : "desc" }
      : { created_at: props.body.sortOrder === "asc" ? "asc" : "desc" };
  let data: Prisma.discussion_board_tagsGetPayload<
    ReturnType<typeof DiscussionBoardTagAtSummaryTransformer.select>
  >[] = [];
  let total: number = 0;
  if (props.body.excludeUnused === true) {
    // Filter to only tags that have at least one article association
    const tagsWithArticles =
      await MyGlobal.prisma.discussion_board_tags.findMany({
        where: {
          ...whereInput,
          articleTags: {
            some: {},
          },
        },
        skip,
        take: limit,
        orderBy: orderByInput,
        ...DiscussionBoardTagAtSummaryTransformer.select(),
      });
    data = tagsWithArticles;
    total = await MyGlobal.prisma.discussion_board_tags.count({
      where: {
        ...whereInput,
        articleTags: {
          some: {},
        },
      },
    });
  } else {
    // Normal query without excludeUnused filter
    data = await MyGlobal.prisma.discussion_board_tags.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardTagAtSummaryTransformer.select(),
    });
    total = await MyGlobal.prisma.discussion_board_tags.count({
      where: whereInput,
    });
  }
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardTagAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
    data: transformedData,
  };
}
