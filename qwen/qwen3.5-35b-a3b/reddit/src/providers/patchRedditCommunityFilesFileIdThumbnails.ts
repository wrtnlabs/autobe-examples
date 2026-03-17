import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileThumbnail";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityFileThumbnailAtSummaryTransformer } from "../transformers/RedditCommunityFileThumbnailAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityFilesFileIdThumbnails(props: {
  fileId: string & tags.Format<"uuid">;
  body: IRedditCommunityFileThumbnail.IRequest;
}): Promise<IPageIRedditCommunityFileThumbnail.ISummary> {
  // Validate parent file exists and is accessible
  await MyGlobal.prisma.reddit_community_files.findUniqueOrThrow({
    where: { id: props.fileId, deleted_at: null },
    select: { id: true },
  });
  // Calculate pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with filters
  const whereInput: Prisma.reddit_community_file_thumbnailsWhereInput = {
    reddit_community_file_id: props.fileId,
    deleted_at: null,
    ...(props.body.variant !== undefined && { variant: props.body.variant }),
    ...(props.body.format !== undefined && { format: props.body.format }),
  };
  // Build ORDER BY clause
  const sortOrder: Prisma.SortOrder =
    props.body.sortOrder === "asc" ? "asc" : "desc";
  const orderByInput =
    props.body.sortBy === "height"
      ? { height: sortOrder }
      : props.body.sortBy === "width"
        ? { width: sortOrder }
        : {
            created_at: sortOrder,
          };
  // Execute query
  const data = await MyGlobal.prisma.reddit_community_file_thumbnails.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityFileThumbnailAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_file_thumbnails.count({
    where: whereInput,
  });
  // Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityFileThumbnailAtSummaryTransformer.transform,
    ),
  } as IPageIRedditCommunityFileThumbnail.ISummary;
}
