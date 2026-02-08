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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorComments(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  // Since ICommunityPlatformComment.IRequest is empty, no filtering parameters are available
  // Use default pagination values
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Filter only non-deleted comments
  const where: Prisma.community_platform_commentsWhereInput = {
    is_deleted: false,
  };
  // Fetch paginated comments
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
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      user: comment.user
        ? {
            display_name: comment.user.display_name,
            avatar_url:
              comment.user.avatar_url === null
                ? undefined
                : comment.user.avatar_url,
          }
        : undefined,
    })),
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
      pages:
        total === 0
          ? 0
          : (Math.ceil(total / limit) satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<0>),
    },
  };
}
