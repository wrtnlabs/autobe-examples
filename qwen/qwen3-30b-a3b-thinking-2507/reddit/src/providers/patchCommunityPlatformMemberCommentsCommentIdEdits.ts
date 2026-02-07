import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEdit";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentEdit";
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

export async function patchCommunityPlatformMemberCommentsCommentIdEdits(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentEdit.IRequest;
}): Promise<IPageICommunityPlatformCommentEdit.ISummary> {
  const {
    cursor = "0",
    limit = 25,
    sort = "created_at:desc",
    filter = {},
    includeDeleted = props.body.includeDeleted ?? false,
  } = props.body;
  const validatedLimit = Math.max(1, Math.min(limit, 100));
  const offset = parseInt(cursor, 10) || 0;
  const [sortField, sortDirection] = sort.split(":");
  const orderBy = {
    [sortField]: sortDirection === "asc" ? "asc" : "desc",
  };
  let whereCondition = { community_platform_comment_id: props.commentId };
  if (!includeDeleted) {
    whereCondition = { ...whereCondition, deleted_at: null };
  }
  const filterCondition = Object.entries(filter).reduce((acc, [key, value]) => {
    if (value !== null) {
      acc[key] = { equals: value };
    }
    return acc;
  }, {});
  const finalWhere = includeDeleted
    ? { ...whereCondition, ...filterCondition }
    : { ...whereCondition, deleted_at: null, ...filterCondition };
  const data = await MyGlobal.prisma.community_platform_comment_edits.findMany({
    where: finalWhere,
    take: validatedLimit,
    skip: offset,
    orderBy,
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      comment: {
        select: {
          id: true,
          content: true,
          created_at: true,
          updated_at: true,
          member: {
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.community_platform_comment_edits.count({
    where: finalWhere,
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (edit) => ({
    id: edit.id,
    created_at: toISOStringSafe(edit.created_at),
    updated_at: toISOStringSafe(edit.updated_at),
    deleted_at: edit.deleted_at ? toISOStringSafe(edit.deleted_at) : null,
    comment: {
      id: edit.comment.id,
      content: edit.comment.content,
      created_at: toISOStringSafe(edit.comment.created_at),
      updated_at: toISOStringSafe(edit.comment.updated_at),
      member: {
        id: edit.comment.member.id,
        email: edit.comment.member.email,
        created_at: toISOStringSafe(edit.comment.member.created_at),
        updated_at: toISOStringSafe(edit.comment.member.updated_at),
      },
    },
  }));
  const nextCursor =
    offset + validatedLimit > total
      ? null
      : (offset + validatedLimit).toString();
  const pagination = {
    current: offset / validatedLimit + 1,
    limit: validatedLimit,
    records: total,
    pages: Math.ceil(total / validatedLimit),
  };
  return {
    data: transformedData,
    pagination,
  };
}
