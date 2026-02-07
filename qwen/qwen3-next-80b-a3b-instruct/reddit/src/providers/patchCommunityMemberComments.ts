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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberComments(props: {
  member: MemberPayload;
  body: ICommunityComment.IRequest;
}): Promise<IPageICommunityComment.ISummary> {
  // Use fixed defaults as no request parameters are defined in IRequest
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Build filter conditions with strict enforcement of 'active' status for members
  const whereConditions: Prisma.community_commentsWhereInput = {
    status: "active",
    deleted_at: null,
    community_member_id: props.member.id,
  };
  // Cursor-based pagination using created_at and id for performance
  // Use created_at desc, id desc to ensure deterministic ordering
  const orderByInput = {
    created_at: "desc" as const,
    id: "desc" as const,
  } satisfies Prisma.community_commentsOrderByWithRelationInput;
  // Fetch paginated data with required relations
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
        select: {
          display_name: true,
        },
      },
      post: {
        select: {
          title: true,
        },
      },
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.community_comments.count({
    where: whereConditions,
  });
  // Transform data to response format with strict type conversion
  const transformedData = data.map((comment) => ({
    id: comment.id as string & tags.Format<"uuid">,
    content: comment.content,
    created_at: toISOStringSafe(comment.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(comment.updated_at) as string &
      tags.Format<"date-time">,
    status: comment.status,
    community_member_id: comment.community_member_id as string &
      tags.Format<"uuid">,
    community_post_id: comment.community_post_id as string &
      tags.Format<"uuid">,
    parent_id: comment.parent_id
      ? (comment.parent_id as string & tags.Format<"uuid">)
      : null,
    community_member_display_name: comment.author?.display_name ?? "",
    community_post_title: comment.post?.title ?? "",
    score: 0,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
