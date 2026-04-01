import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAttachmentAccessLog";
import { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeAttachmentAccessLogAtSummaryTransformer } from "../transformers/RedditLikeAttachmentAccessLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeOwnerAttachmentsAttachmentIdAccessLogs(props: {
  owner: OwnerPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IRedditLikeAttachmentAccessLog.IRequest;
}): Promise<IPageIRedditLikeAttachmentAccessLog.ISummary> {
  // Build where clause with proper typing
  const whereInput: Prisma.reddit_like_attachment_access_logsWhereInput = {
    reddit_like_attachment_id: props.attachmentId,
    ...(props.body.actorType !== undefined &&
      props.body.actorType !== null && {
        actor_type: props.body.actorType,
      }),
    ...(props.body.actorId !== undefined &&
      props.body.actorId !== null && { actor_id: props.body.actorId }),
    ...(props.body.accessType !== undefined &&
      props.body.accessType !== null && {
        access_type: props.body.accessType,
      }),
    ...(props.body.ipAddress !== undefined &&
      props.body.ipAddress !== null && {
        ip_address: { contains: props.body.ipAddress },
      }),
    ...(props.body.userAgent !== undefined &&
      props.body.userAgent !== null && {
        user_agent: { contains: props.body.userAgent },
      }),
  };
  // Handle date range filters
  if (
    props.body.createdAfter !== undefined ||
    props.body.createdBefore !== undefined
  ) {
    whereInput.created_at = {};
    if (props.body.createdAfter !== undefined) {
      whereInput.created_at.gte = new Date(props.body.createdAfter);
    }
    if (props.body.createdBefore !== undefined) {
      whereInput.created_at.lte = new Date(props.body.createdBefore);
    }
  }
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_like_attachment_access_logs.count({
    where: whereInput,
  });
  // Query records with pagination and ordering
  const records =
    await MyGlobal.prisma.reddit_like_attachment_access_logs.findMany({
      where: whereInput,
      ...RedditLikeAttachmentAccessLogAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  // Transform to response DTO
  const data = await ArrayUtil.asyncMap(
    records,
    RedditLikeAttachmentAccessLogAtSummaryTransformer.transform,
  );
  // Build pagination metadata
  const pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
