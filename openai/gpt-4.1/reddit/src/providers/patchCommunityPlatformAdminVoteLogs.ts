import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformVoteLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteLog";
import { IPageICommunityPlatformVoteLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminVoteLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformVoteLog.IRequest;
}): Promise<IPageICommunityPlatformVoteLog> {
  const body = props.body;
  // 1. PAGINATION
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 2. ORDERING
  const allowedSort: (keyof ICommunityPlatformVoteLog)[] = [
    "created_at",
    "vote_type",
    "vote_value",
  ];
  const sort_by =
    body.sort_by && allowedSort.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const order = body.order === "asc" ? "asc" : "desc";
  // 3. WHERE BUILD
  const where: Record<string, unknown> = {};
  if (body.member_id !== undefined)
    where.community_platform_member_id = body.member_id;
  if (body.vote_value !== undefined) where.vote_value = body.vote_value;
  if (body.action_status !== undefined)
    where.action_status = body.action_status;
  if (body.ip_fingerprint !== undefined)
    where.ip_fingerprint = body.ip_fingerprint;
  if (body.user_agent !== undefined) where.user_agent = body.user_agent;

  // Content filter logic
  if (body.content_type === "post") {
    if (body.content_id !== undefined) {
      where.community_platform_post_id = body.content_id;
    }
    where.vote_type = "post";
  } else if (body.content_type === "comment") {
    if (body.content_id !== undefined) {
      where.community_platform_comment_id = body.content_id;
    }
    where.vote_type = "comment";
  }
  // Date ranges
  if (body.created_after !== undefined && body.created_after !== null) {
    (where as any).created_at = Object.assign((where as any).created_at ?? {}, {
      gte: body.created_after,
    });
  }
  if (body.created_before !== undefined && body.created_before !== null) {
    (where as any).created_at = Object.assign((where as any).created_at ?? {}, {
      lte: body.created_before,
    });
  }
  // 4. QUERY
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_vote_logs.findMany({
      where: where,
      orderBy: { [sort_by]: order },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_vote_logs.count({ where }),
  ]);
  // 5. MAP TO DTO
  const data = rows.map((r) => {
    return {
      id: r.id,
      community_platform_member_id: r.community_platform_member_id,
      community_platform_post_id: r.community_platform_post_id ?? undefined,
      community_platform_comment_id:
        r.community_platform_comment_id ?? undefined,
      vote_type: r.vote_type,
      vote_value: r.vote_value,
      ip_fingerprint: r.ip_fingerprint ?? undefined,
      user_agent: r.user_agent ?? undefined,
      action_status: r.action_status,
      action_message: r.action_message ?? undefined,
      created_at: toISOStringSafe(r.created_at),
    };
  });
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
