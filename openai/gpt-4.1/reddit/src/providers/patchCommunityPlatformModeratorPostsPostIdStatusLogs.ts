import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostStatusLog";
import { IPageICommunityPlatformPostStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostStatusLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorPostsPostIdStatusLogs(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostStatusLog.IRequest;
}): Promise<IPageICommunityPlatformPostStatusLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Dynamic where clause
  const where: Record<string, any> = {
    post_id: props.postId,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { new_status: props.body.status }),
    ...(props.body.actor_user_id !== undefined &&
      props.body.actor_user_id !== null && {
        user_id: props.body.actor_user_id,
      }),
    ...(props.body.session_id !== undefined &&
      props.body.session_id !== null && {
        user_session_id: props.body.session_id,
      }),
  };
  if (
    props.body.from_datetime !== undefined &&
    props.body.from_datetime !== null
  ) {
    where.created_at = { gte: props.body.from_datetime };
  }
  if (props.body.to_datetime !== undefined && props.body.to_datetime !== null) {
    where.created_at = where.created_at || {};
    where.created_at.lte = props.body.to_datetime;
  }

  // Order by
  let orderBy: any;
  if (props.body.sort_by) {
    orderBy = {};
    orderBy[props.body.sort_by] = props.body.sort_order ?? "desc";
  } else {
    orderBy = { created_at: "desc" };
  }

  // Fetch logs with post included for community_id and user_id
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_status_logs.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        post: {
          select: { id: true, community_id: true, user_id: true },
        },
      },
    }),
    MyGlobal.prisma.community_platform_post_status_logs.count({ where }),
  ]);

  const defaultDate = toISOStringSafe(new Date(0));

  const data = logs.map((log) => ({
    id: log.id,
    post: {
      id: log.post_id,
      community_id:
        log.post?.community_id ?? (v4() as string & tags.Format<"uuid">),
      user_id: log.post?.user_id ?? log.user_id,
    },
    user: {
      id: log.user_id,
    },
    userSession: {
      id: log.user_session_id,
      created_at: defaultDate,
    },
    old_status: log.old_status ?? undefined,
    new_status: log.new_status,
    reason: log.reason ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
