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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_like_attachment_access_logsWhereInput = {
    reddit_like_attachment_id: props.attachmentId satisfies string as string,
    deleted_at: null,
  };
  if (props.body.actorType !== undefined && props.body.actorType !== null) {
    whereInput.actor_type = props.body.actorType;
  }
  if (props.body.actorId !== undefined && props.body.actorId !== null) {
    whereInput.actor_id = props.body.actorId satisfies string as string;
  }
  if (props.body.accessType !== undefined && props.body.accessType !== null) {
    whereInput.access_type = props.body.accessType;
  }
  if (props.body.ipAddress !== undefined && props.body.ipAddress !== null) {
    whereInput.ip_address = { contains: props.body.ipAddress };
  }
  if (props.body.userAgent !== undefined && props.body.userAgent !== null) {
    whereInput.user_agent = { contains: props.body.userAgent };
  }
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (
    props.body.createdAfter !== undefined &&
    props.body.createdAfter !== null
  ) {
    createdAtFilter.gte = new Date(props.body.createdAfter);
  }
  if (
    props.body.createdBefore !== undefined &&
    props.body.createdBefore !== null
  ) {
    createdAtFilter.lte = new Date(props.body.createdBefore);
  }
  if (createdAtFilter.gte !== undefined || createdAtFilter.lte !== undefined) {
    whereInput.created_at = createdAtFilter;
  }
  const data =
    await MyGlobal.prisma.reddit_like_attachment_access_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditLikeAttachmentAccessLogAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.reddit_like_attachment_access_logs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikeAttachmentAccessLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}
