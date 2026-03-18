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
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  if (props.body.postId !== undefined) {
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.body.postId },
      select: { id: true },
    });
  }
  const data = await MyGlobal.prisma.community_platform_comments.findMany({
    where: {
      deleted_at: null,
      ...(props.body.postId !== undefined
        ? { community_platform_post_id: props.body.postId }
        : {}),
      ...(props.body.parentId !== undefined
        ? { parent_id: props.body.parentId }
        : {}),
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      community_platform_post_id: true,
      community_platform_member_id: true,
      parent_id: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const records: number =
    await MyGlobal.prisma.community_platform_comments.count({
      where: {
        deleted_at: null,
        ...(props.body.postId !== undefined
          ? { community_platform_post_id: props.body.postId }
          : {}),
        ...(props.body.parentId !== undefined
          ? { parent_id: props.body.parentId }
          : {}),
      },
    });
  return {
    data: data.map(
      (comment): ICommunityPlatformComment.ISummary => ({
        id: comment.id,
        community_platform_post_id: comment.community_platform_post_id,
        community_platform_member_id: comment.community_platform_member_id,
        parent_id: comment.parent_id,
        content: comment.content,
        created_at: comment.created_at.toISOString(),
        updated_at: comment.updated_at.toISOString(),
        deleted_at:
          comment.deleted_at === null ? null : comment.deleted_at.toISOString(),
      }),
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
