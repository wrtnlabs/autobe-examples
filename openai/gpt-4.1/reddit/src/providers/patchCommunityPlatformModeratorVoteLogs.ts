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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorVoteLogs(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformVoteLog.IRequest;
}): Promise<IPageICommunityPlatformVoteLog> {
  // Authorization is handled upstream (ModeratorPayload required). No extra checks because passing the payload guarantees moderator access.
  const { body } = props;
  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Sorting
  const sortBy = body.sort_by ?? "created_at";
  const order: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";

  // Build where filter
  const where = {
    ...(body.member_id !== undefined && {
      community_platform_member_id: body.member_id,
    }),
    // Content type/ID logic
    ...(body.content_type !== undefined && body.content_id !== undefined
      ? body.content_type === "post"
        ? { community_platform_post_id: body.content_id }
        : body.content_type === "comment"
          ? { community_platform_comment_id: body.content_id }
          : {}
      : body.content_type === "post"
        ? { community_platform_post_id: { not: null } }
        : body.content_type === "comment"
          ? { community_platform_comment_id: { not: null } }
          : body.content_id !== undefined
            ? {
                OR: [
                  { community_platform_post_id: body.content_id },
                  { community_platform_comment_id: body.content_id },
                ],
              }
            : {}),
    ...(body.vote_value !== undefined && { vote_value: body.vote_value }),
    ...(body.action_status !== undefined && {
      action_status: body.action_status,
    }),
    ...(body.ip_fingerprint !== undefined && {
      ip_fingerprint: body.ip_fingerprint,
    }),
    ...(body.user_agent !== undefined && {
      user_agent: body.user_agent,
    }),
    ...(body.created_after !== undefined || body.created_before !== undefined
      ? {
          created_at: {
            ...(body.created_after !== undefined && {
              gte: toISOStringSafe(body.created_after),
            }),
            ...(body.created_before !== undefined && {
              lte: toISOStringSafe(body.created_before),
            }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_vote_logs.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_vote_logs.count({ where }),
  ]);

  // Build API return values
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      community_platform_member_id: row.community_platform_member_id,
      community_platform_post_id: row.community_platform_post_id ?? undefined,
      community_platform_comment_id:
        row.community_platform_comment_id ?? undefined,
      vote_type: row.vote_type,
      vote_value: row.vote_value,
      ip_fingerprint: row.ip_fingerprint ?? undefined,
      user_agent: row.user_agent ?? undefined,
      action_status: row.action_status,
      action_message: row.action_message ?? undefined,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
