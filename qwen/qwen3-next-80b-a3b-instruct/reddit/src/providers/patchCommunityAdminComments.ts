import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
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

export async function patchCommunityAdminComments(props: {
  admin: AdminPayload;
  body: ICommunityComment.IRequest;
}): Promise<IPageICommunityComment.ISummary> {
  // Default pagination values as specified
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause based on default schema - since IRequest doesn't contain these properties, using static defaults
  const whereConditions = {
    deleted_at: null,
  } satisfies Prisma.community_commentsWhereInput;
  // Build ORDER BY clause - use only existing Prisma fields, remove karma_score since it's not a valid column
  const orderByInput = {
    created_at: "desc" as const,
  } satisfies Prisma.community_commentsOrderByWithRelationInput;
  // Query community_comments
  const data = await MyGlobal.prisma.community_comments.findMany({
    where: whereConditions,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      status: true,
      community_member_id: true,
      community_post_id: true,
      parent_id: true,
      author: {
        select: { display_name: true },
      },
      post: {
        select: { title: true },
      },
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.community_comments.count({
    where: whereConditions,
  });
  // Fetch karma scores for all members in this page with a single query
  const memberIds = Array.from(
    new Set(data.map((item) => item.community_member_id)),
  );
  let karmaMap: Record<string, number> = {};
  if (memberIds.length > 0) {
    const karmaRecords = await MyGlobal.prisma.community_karma_scores.findMany({
      where: {
        actor_id: { in: memberIds },
        actor_type: "member",
        deleted_at: null,
      },
      select: { actor_id: true, karma_score: true },
    });
    karmaMap = karmaRecords.reduce(
      (acc, record) => {
        if (record.actor_id) {
          acc[record.actor_id] = record.karma_score;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
  }
  // Transform data to ISummary format
  const summaryData = data.map((item) => ({
    id: item.id,
    content: item.content,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    status: item.status,
    community_member_id: item.community_member_id,
    community_post_id: item.community_post_id,
    parent_id: item.parent_id ?? null,
    community_member_display_name: item.author?.display_name ?? "",
    community_post_title: item.post?.title ?? "",
    score: karmaMap[item.community_member_id] ?? 0,
  })) as ICommunityComment.ISummary[];
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
