import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserComments(props: {
  user: UserPayload;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = {
    is_deleted: false,
    ...(props.body.postId && { post_id: props.body.postId }),
    ...(props.body.userId && { user_id: props.body.userId }),
    ...(props.body.parentId !== undefined
      ? { parent_id: props.body.parentId || null }
      : {}),
    ...(props.body.content
      ? { content: { contains: props.body.content, mode: "insensitive" } }
      : {}),
    ...(props.body.fromCreatedAt || props.body.toCreatedAt
      ? {
          created_at: {
            ...(props.body.fromCreatedAt
              ? { gte: props.body.fromCreatedAt }
              : {}),
            ...(props.body.toCreatedAt ? { lte: props.body.toCreatedAt } : {}),
          },
        }
      : {}),
  } satisfies Prisma.community_platform_commentsWhereInput;
  const orderBy =
    props.body.sort === "updatedAt"
      ? { updated_at: "asc" as const }
      : { created_at: "asc" as const };
  async function selectChildren(
    parentId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformComment.ISummary[]> {
    const children = await MyGlobal.prisma.community_platform_comments.findMany(
      {
        where: { parent_id: parentId, is_deleted: false },
        orderBy,
        select: {
          id: true,
          content: true,
          is_deleted: true,
          created_at: true,
          updated_at: true,
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          parent_id: true,
        },
      },
    );
    return Promise.all(
      children.map(async (child) => ({
        id: child.id,
        content: child.content,
        isDeleted: child.is_deleted,
        createdAt: toISOStringSafe(child.created_at),
        updatedAt: toISOStringSafe(child.updated_at),
        author: {
          id: child.user.id,
          email: child.user.email,
          username: child.user.username,
          displayName: child.user.display_name,
          bio: child.user.bio ?? null,
          avatarUrl: child.user.avatar_url ?? null,
          karma: child.user.karma,
          createdAt: toISOStringSafe(child.user.created_at),
          updatedAt: toISOStringSafe(child.user.updated_at),
          deletedAt: child.user.deleted_at
            ? toISOStringSafe(child.user.deleted_at)
            : null,
        },
        parentId: child.parent_id,
        children: await selectChildren(child.id),
      })),
    );
  }
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comments.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        content: true,
        is_deleted: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        parent_id: true,
      },
    }),
    MyGlobal.prisma.community_platform_comments.count({ where }),
  ]);
  const data = await Promise.all(
    comments.map(async (comment) => ({
      id: comment.id,
      content: comment.content,
      isDeleted: comment.is_deleted,
      createdAt: toISOStringSafe(comment.created_at),
      updatedAt: toISOStringSafe(comment.updated_at),
      author: {
        id: comment.user.id,
        email: comment.user.email,
        username: comment.user.username,
        displayName: comment.user.display_name,
        bio: comment.user.bio ?? null,
        avatarUrl: comment.user.avatar_url ?? null,
        karma: comment.user.karma,
        createdAt: toISOStringSafe(comment.user.created_at),
        updatedAt: toISOStringSafe(comment.user.updated_at),
        deletedAt: comment.user.deleted_at
          ? toISOStringSafe(comment.user.deleted_at)
          : null,
      },
      parentId: comment.parent_id,
      children: await selectChildren(comment.id),
    })),
  );
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
