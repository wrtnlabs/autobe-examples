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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeAttachmentAccessLogAtSummaryTransformer } from "../transformers/RedditLikeAttachmentAccessLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorAttachmentsAttachmentIdAccessLogs(props: {
  moderator: ModeratorPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IRedditLikeAttachmentAccessLog.IRequest;
}): Promise<IPageIRedditLikeAttachmentAccessLog.ISummary> {
  const page = (props.body.page ?? 1) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (props.body.limit ?? 100) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> as number;
  const skip = (page - 1) * limit;
  const where = {
    reddit_like_attachment_id: props.attachmentId,
    deleted_at: null,
    ...(props.body.actorType !== undefined &&
      props.body.actorType !== null && {
        actor_type: props.body.actorType,
      }),
    ...(props.body.actorId !== undefined &&
      props.body.actorId !== null && {
        actor_id: props.body.actorId,
      }),
    ...(props.body.accessType !== undefined && {
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
    ...(props.body.createdAfter !== undefined && {
      created_at: { gte: new Date(props.body.createdAfter) },
    }),
    ...(props.body.createdBefore !== undefined && {
      created_at: { lte: new Date(props.body.createdBefore) },
    }),
  } satisfies Prisma.reddit_like_attachment_access_logsWhereInput;
  const data =
    await MyGlobal.prisma.reddit_like_attachment_access_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditLikeAttachmentAccessLogAtSummaryTransformer.select(),
    } satisfies Prisma.reddit_like_attachment_access_logsFindManyArgs);
  const total = await MyGlobal.prisma.reddit_like_attachment_access_logs.count({
    where,
  });
  const transformed = await ArrayUtil.asyncMap(
    data,
    RedditLikeAttachmentAccessLogAtSummaryTransformer.transform,
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
