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
  const file = await MyGlobal.prisma.reddit_community_files.findUniqueOrThrow({
    where: { id: props.fileId },
    select: { id: true, deleted_at: true },
  });
  if (file.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_file_thumbnailsWhereInput = {
    reddit_community_file_id: props.fileId,
    deleted_at: null,
    ...(props.body.variant !== undefined && {
      variant: props.body.variant,
    }),
    ...(props.body.format !== undefined && {
      format: props.body.format,
    }),
  } satisfies Prisma.reddit_community_file_thumbnailsWhereInput;
  const orderByInput: Prisma.reddit_community_file_thumbnailsOrderByWithRelationInput =
    props.body.sortBy === "height"
      ? { height: "desc" as const }
      : props.body.sortBy === "width"
        ? { width: "desc" as const }
        : { created_at: "desc" as const };
  const data = await MyGlobal.prisma.reddit_community_file_thumbnails.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityFileThumbnailAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_file_thumbnails.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityFileThumbnailAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
