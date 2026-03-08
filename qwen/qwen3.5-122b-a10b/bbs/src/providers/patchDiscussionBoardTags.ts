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
  // Pagination defaults and validation
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.discussion_board_tagsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  };
  // Build orderBy
  const orderByInput: Prisma.discussion_board_tagsOrderByWithRelationInput[] =
    [];
  if (props.body.sort_by === "name") {
    orderByInput.push({
      name: props.body.sort_order ?? "asc",
    });
  } else if (props.body.sort_by === "created_at") {
    orderByInput.push({
      created_at: props.body.sort_order ?? "desc",
    });
  } else if (props.body.sort_by === "usage_count") {
    // For usage_count, we need to aggregate via article_tags
    orderByInput.push({
      articleTags: {
        _count: props.body.sort_order ?? "desc",
      },
    });
  } else {
    // Default sort by created_at descending
    orderByInput.push({
      created_at: "desc",
    });
  }
  // Execute queries
  const data = await MyGlobal.prisma.discussion_board_tags.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...DiscussionBoardTagAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_tags.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardTagAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
