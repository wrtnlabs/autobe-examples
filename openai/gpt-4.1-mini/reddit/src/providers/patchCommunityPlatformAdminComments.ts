import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminComments(props: {
  admin: AdminPayload;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = 0;
  const where = {
    AND: [{ is_deleted: false }],
  } as Prisma.community_platform_commentsWhereInput;
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      user_id: true,
      post_id: true,
      parent_id: true,
      content: true,
      is_deleted: true,
      created_at: true,
      updated_at: true,
      user: {
        select: {
          display_name: true,
          avatar_url: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where,
  });
  return {
    data: comments.map((comment) => ({
      id: comment.id,
      user_id: comment.user_id,
      post_id: comment.post_id,
      parent_id: comment.parent_id === null ? undefined : comment.parent_id,
      content: comment.content,
      is_deleted: comment.is_deleted,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      user: {
        display_name: comment.user.display_name,
        avatar_url:
          comment.user.avatar_url === null
            ? undefined
            : comment.user.avatar_url,
      },
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
