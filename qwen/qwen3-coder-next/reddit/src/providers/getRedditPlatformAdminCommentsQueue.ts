import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
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

export async function getRedditPlatformAdminCommentsQueue(props: {
  admin: AdminPayload;
}): Promise<IPageIRedditPlatformComment> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: {
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      author_id: true,
      post_id: true,
      parent_comment_id: true,
      content: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_comments.count({
    where: {
      deleted_at: null,
    },
  });
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      author_id: record.author_id as string & tags.Format<"uuid">,
      post_id: record.post_id as string & tags.Format<"uuid">,
      parent_comment_id: record.parent_comment_id
        ? (record.parent_comment_id as string & tags.Format<"uuid">)
        : null,
      content: record.content,
      vote_score: record.vote_score,
      comment_count: record.comment_count,
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(record.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: record.deleted_at
        ? (toISOStringSafe(record.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
