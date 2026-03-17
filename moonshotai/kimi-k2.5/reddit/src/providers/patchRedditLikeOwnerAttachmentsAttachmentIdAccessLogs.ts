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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_like_attachment_access_logsWhereInput = {
    reddit_like_attachment_id: props.attachmentId,
    ...(props.body.actorType !== undefined &&
      props.body.actorType !== null && {
        actor_type: props.body.actorType,
      }),
    ...(props.body.actorId !== undefined &&
      props.body.actorId !== null && {
        actor_id: props.body.actorId,
      }),
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
    ...(props.body.createdAfter !== undefined &&
      props.body.createdAfter !== null && {
        created_at: { gte: props.body.createdAfter },
      }),
    ...(props.body.createdBefore !== undefined &&
      props.body.createdBefore !== null && {
        created_at: { lte: props.body.createdBefore },
      }),
  };
  const logs =
    (await MyGlobal.prisma.reddit_like_attachment_access_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditLikeAttachmentAccessLogAtSummaryTransformer.select(),
    })) as any;
  const total = await MyGlobal.prisma.reddit_like_attachment_access_logs.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    logs,
    RedditLikeAttachmentAccessLogAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
