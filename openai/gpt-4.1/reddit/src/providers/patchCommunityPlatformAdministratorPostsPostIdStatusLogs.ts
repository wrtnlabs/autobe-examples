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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorPostsPostIdStatusLogs(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostStatusLog.IRequest;
}): Promise<IPageICommunityPlatformPostStatusLog.ISummary> {
  // 1. Ensure the post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: {
      id: props.postId,
    },
    include: {
      user: true,
      community: true,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // 2. Determine pagination
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // 3. Build filters
  const where = {
    post_id: props.postId,
    ...(props.body.status != null && { new_status: props.body.status }),
    ...(props.body.actor_user_id != null && {
      user_id: props.body.actor_user_id,
    }),
    ...(props.body.session_id != null && {
      user_session_id: props.body.session_id,
    }),
    ...(props.body.from_datetime != null || props.body.to_datetime != null
      ? {
          created_at: {
            ...(props.body.from_datetime != null && {
              gte: props.body.from_datetime,
            }),
            ...(props.body.to_datetime != null && {
              lte: props.body.to_datetime,
            }),
          },
        }
      : {}),
  };

  // 4. Determine sort
  const availableSortFields: Record<string, string> = {
    created_at: "created_at",
    new_status: "new_status",
    actor_user_id: "user_id",
    session_id: "user_session_id",
  };
  const sortBy = props.body.sort_by ?? "created_at";
  const orderByField = availableSortFields[sortBy] ?? "created_at";
  const orderByDirection = props.body.sort_order ?? "desc";
  const orderBy = { [orderByField]: orderByDirection };

  // 5. Query status logs
  const [total, logs] = await Promise.all([
    MyGlobal.prisma.community_platform_post_status_logs.count({ where }),
    MyGlobal.prisma.community_platform_post_status_logs.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        user: true,
        userSession: true,
      },
    }),
  ]);

  // 6. Map to DTOs
  const data = logs.map((log) => ({
    id: log.id,
    post: {
      id: log.post_id,
      community_id: post.community_id,
      community: post.community
        ? {
            id: post.community.id,
            name: post.community.name,
            display_title: post.community.display_title,
            description: post.community.description,
            visibility: post.community.visibility,
            image_url: post.community.image_url ?? null,
            status: post.community.status,
          }
        : undefined,
      user_id: post.user_id,
      user: post.user
        ? {
            id: post.user.id,
          }
        : undefined,
    },
    user: log.user ? { id: log.user.id } : { id: log.user_id },
    userSession: log.userSession
      ? {
          id: log.userSession.id,
          created_at: toISOStringSafe(log.userSession.created_at),
        }
      : {
          id: log.user_session_id,
          created_at: "",
        },
    old_status: log.old_status ?? null,
    new_status: log.new_status,
    reason: log.reason ?? null,
    created_at: toISOStringSafe(log.created_at),
  }));

  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
