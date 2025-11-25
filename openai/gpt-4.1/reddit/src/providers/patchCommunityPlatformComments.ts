import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function patchCommunityPlatformComments(props: {
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build dynamic filter conditions
  const where: Record<string, any> = {};

  // Soft-delete (assume business rule: only show active)
  where.deleted_at = null;

  if (props.body.post_id != null) {
    where.post_id = props.body.post_id;
  }
  if (props.body.user_id != null) {
    where.user_id = props.body.user_id;
  }
  if (props.body.parent_id != null) {
    where.parent_id = props.body.parent_id;
  }
  if (props.body.session_id != null) {
    where.session_id = props.body.session_id;
  }
  if (props.body.search) {
    where.body = { search: props.body.search };
  }

  const orderByField = props.body.sort_by ?? "created_at";
  let sortDirection: "asc" | "desc" = "desc";
  if (
    props.body.sort_direction === "asc" ||
    props.body.sort_direction === "desc"
  ) {
    sortDirection = props.body.sort_direction;
  }
  const orderBy = { [orderByField]: sortDirection };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comments.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: true,
        post: true,
      },
    }),
    MyGlobal.prisma.community_platform_comments.count({ where }),
  ]);

  const data = records.map((comment) => ({
    id: comment.id,
    user: { id: comment.user_id },
    post: {
      id: comment.post_id,
      user_id: comment.post.user_id,
      community_id: comment.post.community_id,
    },
    parent_id: comment.parent_id ?? undefined,
    created_at: toISOStringSafe(comment.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
