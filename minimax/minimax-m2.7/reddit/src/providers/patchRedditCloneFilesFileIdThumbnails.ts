import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileThumbnail";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneFilesFileIdThumbnails(props: {
  fileId: string & tags.Format<"uuid">;
  body: IRedditCloneFileThumbnail.IRequest;
}): Promise<IPageIRedditCloneFileThumbnail.ISummary> {
  // Verify the parent file exists
  await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
    where: { id: props.fileId },
  });
  // Build pagination parameters
  const page = props.body.page ?? (1 as const);
  const limit = props.body.limit ?? (100 as const);
  const skip = (page - 1) * limit;
  // Build where clause from request filters
  const whereClause = {
    reddit_clone_file_id: props.fileId,
    ...(props.body.variant !== undefined && { variant: props.body.variant }),
    ...(props.body.minWidth !== undefined && {
      width: { gte: props.body.minWidth },
    }),
    ...(props.body.maxWidth !== undefined && {
      width: {
        ...(props.body.minWidth !== undefined
          ? { gte: props.body.minWidth }
          : {}),
        lte: props.body.maxWidth,
      },
    }),
    ...(props.body.minHeight !== undefined && {
      height: { gte: props.body.minHeight },
    }),
    ...(props.body.maxHeight !== undefined && {
      height: {
        ...(props.body.minHeight !== undefined
          ? { gte: props.body.minHeight }
          : {}),
        lte: props.body.maxHeight,
      },
    }),
  } satisfies Prisma.reddit_clone_file_thumbnailsWhereInput;
  // Query thumbnails with pagination
  const thumbnails =
    await MyGlobal.prisma.reddit_clone_file_thumbnails.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        variant: true,
        width: true,
        height: true,
        thumbnail_path: true,
        created_at: true,
      },
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_clone_file_thumbnails.count({
    where: whereClause,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: thumbnails.map(
      (thumbnail) =>
        ({
          id: thumbnail.id,
          variant: thumbnail.variant,
          width: thumbnail.width,
          height: thumbnail.height,
          thumbnailPath: thumbnail.thumbnail_path,
          createdAt: thumbnail.created_at.toISOString(),
        }) satisfies IRedditCloneFileThumbnail.ISummary,
    ),
  };
}
