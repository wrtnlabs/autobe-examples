import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFile";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityFileAtSummaryTransformer } from "../transformers/RedditCommunityFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityFiles(props: {
  body: IRedditCommunityFile.IRequest;
}): Promise<IPageIRedditCommunityFile.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  // Check if cursor-based pagination is requested
  const hasCursor = props.body.cursor !== undefined;
  const hasOffset = page !== undefined || limit !== undefined;
  // Build WHERE clause with all filters
  const whereInput: Prisma.reddit_community_filesWhereInput = {
    deleted_at: null,
    ...(props.body.file_type && { file_type: props.body.file_type }),
    ...(props.body.mime_type && { mime_type: props.body.mime_type }),
    ...(props.body.created_after && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
    ...(props.body.min_file_size !== undefined && {
      file_size: { gte: props.body.min_file_size },
    }),
    ...(props.body.max_file_size !== undefined && {
      file_size: { lte: props.body.max_file_size },
    }),
  };
  // Build ORDER BY clause
  const orderByInput = (
    props.body.sort_by === "file_size"
      ? { file_size: props.body.sort_order ?? ("desc" as const) }
      : { created_at: props.body.sort_order ?? ("desc" as const) }
  ) satisfies Prisma.reddit_community_filesOrderByWithRelationInput;
  let data: Array<RedditCommunityFileAtSummaryTransformer.Payload>;
  let total: number;
  // Cursor-based pagination
  if (hasCursor) {
    const cursor = props.body.cursor!;
    data = await MyGlobal.prisma.reddit_community_files.findMany({
      where: whereInput,
      take: props.body.page_size ?? 20,
      skip: 1, // Skip the cursor record itself
      cursor: { id: cursor },
      orderBy: orderByInput,
      ...RedditCommunityFileAtSummaryTransformer.select(),
    });
    total = await MyGlobal.prisma.reddit_community_files.count({
      where: whereInput,
    });
    return {
      data: await ArrayUtil.asyncMap(
        data,
        RedditCommunityFileAtSummaryTransformer.transform,
      ),
      pagination: {
        current: 1,
        limit: props.body.page_size ?? 20,
        records: total,
        pages: Math.ceil(total / (props.body.page_size ?? 20)),
      } satisfies IPage.IPagination,
    };
  }
  // Offset-based pagination
  const pageNum = page ?? 1;
  const limitNum = limit ?? 100;
  const skipCount = (pageNum - 1) * limitNum;
  data = await MyGlobal.prisma.reddit_community_files.findMany({
    where: whereInput,
    skip: skipCount,
    take: limitNum,
    orderBy: orderByInput,
    ...RedditCommunityFileAtSummaryTransformer.select(),
  });
  total = await MyGlobal.prisma.reddit_community_files.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityFileAtSummaryTransformer.transform,
    ),
    pagination: {
      current: pageNum,
      limit: limitNum,
      records: total,
      pages: Math.ceil(total / limitNum),
    } satisfies IPage.IPagination,
  };
}
