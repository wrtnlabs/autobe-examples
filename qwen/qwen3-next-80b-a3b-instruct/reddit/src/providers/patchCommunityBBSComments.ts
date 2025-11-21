import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSComment";
import { IPageICommunityBBSComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityBBSComments(props: {
  body: ICommunityBBSComment.IRequest;
}): Promise<IPageICommunityBBSComment.ISummary> {
  const search = props.body;

  // Default pagination values
  const page = 1;
  const limit = 20;

  // Build where condition for Prisma query
  // ISummary: deleted_at is nullable, so we exclude soft-deleted comments
  const where: Record<string, any> = {
    deleted_at: null,
  };

  // Full-text search using GIN index on body
  if (search && search.trim().length > 0) {
    where.body = { contains: search, mode: "insensitive" };
  }

  // Calculate pagination offset
  const skip = (page - 1) * limit;

  // Fetch data and count concurrently
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_comments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        post_id: true,
        citizen_id: true,
        body: true,
        business_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.community_bbs_comments.count({ where }),
  ]);

  // Transform Prisma result to ISummary format - guarantee type safety
  const data = typia.assert<ICommunityBBSComment.ISummary[]>(
    comments.map((comment) => ({
      id: comment.id,
      post_id: comment.post_id,
      citizen_id: comment.citizen_id,
      body: comment.body,
      business_status: comment.business_status,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      deleted_at: comment.deleted_at
        ? toISOStringSafe(comment.deleted_at)
        : null,
    })),
  );

  // Calculate pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return { data, pagination };
}
