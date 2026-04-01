import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAttachmentThumbnail";
import { IRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeAttachmentThumbnailAtSummaryTransformer } from "../transformers/RedditLikeAttachmentThumbnailAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeAttachmentsAttachmentIdThumbnails(props: {
  attachmentId: string & tags.Format<"uuid">;
  body: IRedditLikeAttachmentThumbnail.IRequest;
}): Promise<IPageIRedditLikeAttachmentThumbnail.ISummary> {
  // Verify attachment exists
  await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
    where: { id: props.attachmentId },
  });
  // Build where clause with filters
  const whereInput = {
    reddit_like_attachment_id: props.attachmentId,
    ...(props.body.width !== null && { width: props.body.width }),
    ...(props.body.height !== null && { height: props.body.height }),
    ...(props.body.quality !== null && { quality: props.body.quality }),
    ...(props.body.format !== null && { format: props.body.format }),
  } satisfies Prisma.reddit_like_attachment_thumbnailsWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query thumbnails with pagination
  const data = await MyGlobal.prisma.reddit_like_attachment_thumbnails.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditLikeAttachmentThumbnailAtSummaryTransformer.select(),
    },
  );
  // Count total records
  const total = await MyGlobal.prisma.reddit_like_attachment_thumbnails.count({
    where: whereInput,
  });
  // Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikeAttachmentThumbnailAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
