import { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberPostsPostIdCommentsCommentIdFiles(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentFile.IRequest;
}): Promise<IPageICommunityPlatformCommentFile.ISummary> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
    where: {
      id: props.commentId,
      community_platform_post_id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    community_platform_comment_id: props.commentId,
    deleted_at: null,
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              original_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              storage_key: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.mimeType !== undefined
      ? {
          mime_type: props.body.mimeType,
        }
      : {}),
    ...(props.body.minSize !== undefined || props.body.maxSize !== undefined
      ? {
          size: {
            ...(props.body.minSize !== undefined
              ? {
                  gte: props.body.minSize,
                }
              : {}),
            ...(props.body.maxSize !== undefined
              ? {
                  lte: props.body.maxSize,
                }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.community_platform_comment_filesWhereInput;
  const orderBy = (
    props.body.sort === "createdAt" || props.body.sort === "createdAt:desc"
      ? [{ created_at: "desc" }, { id: "asc" }]
      : props.body.sort === "createdAt:asc"
        ? [{ created_at: "asc" }, { id: "asc" }]
        : props.body.sort === "originalName" ||
            props.body.sort === "originalName:asc"
          ? [{ original_name: "asc" }, { id: "asc" }]
          : props.body.sort === "originalName:desc"
            ? [{ original_name: "desc" }, { id: "asc" }]
            : props.body.sort === "mimeType" ||
                props.body.sort === "mimeType:asc"
              ? [{ mime_type: "asc" }, { id: "asc" }]
              : props.body.sort === "mimeType:desc"
                ? [{ mime_type: "desc" }, { id: "asc" }]
                : props.body.sort === "size" || props.body.sort === "size:asc"
                  ? [{ size: "asc" }, { id: "asc" }]
                  : props.body.sort === "size:desc"
                    ? [{ size: "desc" }, { id: "asc" }]
                    : [{ created_at: "desc" }, { id: "asc" }]
  ) satisfies Prisma.community_platform_comment_filesOrderByWithRelationInput[];
  const records =
    await MyGlobal.prisma.community_platform_comment_files.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        original_name: true,
        mime_type: true,
        storage_key: true,
        size: true,
        created_at: true,
        updated_at: true,
      },
    });
  const total = await MyGlobal.prisma.community_platform_comment_files.count({
    where,
  });
  return {
    data: records.map(
      (record) =>
        ({
          id: record.id,
          original_name: record.original_name,
          mime_type: record.mime_type,
          storage_key: record.storage_key,
          size: record.size,
          created_at: record.created_at.toISOString(),
          updated_at: record.updated_at.toISOString(),
        }) satisfies ICommunityPlatformCommentFile.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
