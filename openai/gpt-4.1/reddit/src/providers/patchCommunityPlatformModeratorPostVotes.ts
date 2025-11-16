import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorPostVotes(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformPostVote.IRequest;
}): Promise<IPageICommunityPlatformPostVote.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  const includeDeleted = body.include_deleted === true;

  // Build dynamic where clause
  const where: Record<string, any> = {
    ...(body.post_id ? { post_id: body.post_id } : {}),
    ...(body.user_id ? { user_id: body.user_id } : {}),
    ...(body.vote_type ? { vote_type: body.vote_type } : {}),
    ...(body.created_from || body.created_to
      ? {
          created_at: {
            ...(body.created_from ? { gte: body.created_from } : {}),
            ...(body.created_to ? { lte: body.created_to } : {}),
          },
        }
      : {}),
    ...(includeDeleted ? {} : { deleted_at: null }),
  };

  // Build sorting
  let orderBy: any = { created_at: "desc" };
  if (body.sort_by === "vote_type") {
    orderBy = { vote_type: body.sort_order ?? "desc" };
  } else if (body.sort_by === "updated_at") {
    orderBy = { updated_at: body.sort_order ?? "desc" };
  } else if (body.sort_by === "created_at") {
    orderBy = { created_at: body.sort_order ?? "desc" };
  }

  // Fetch data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_votes.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        post: {
          select: {
            id: true,
            community_id: true,
            user_id: true,
            // For post.community or post.user summaries, must select summary fields only
            community: {
              select: {
                id: true,
                name: true,
                display_title: true,
                description: true,
                visibility: true,
                image_url: true,
                status: true,
              },
            },
            user: {
              select: {
                id: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
          },
        },
      },
    }),
    MyGlobal.prisma.community_platform_post_votes.count({ where }),
  ]);

  // Map results to ISummary DTO contract
  const data = rows.map((row) => ({
    id: row.id,
    vote_type: typia.assert<"up" | "down">(row.vote_type),
    created_at: toISOStringSafe(row.created_at),
    post: {
      id: row.post.id,
      community_id: row.post.community_id,
      community: row.post.community
        ? {
            id: row.post.community.id,
            name: row.post.community.name,
            display_title: row.post.community.display_title,
            description: row.post.community.description,
            visibility: row.post.community.visibility,
            image_url: row.post.community.image_url ?? undefined,
            status: row.post.community.status,
          }
        : undefined,
      user_id: row.post.user_id,
      user: row.post.user ? { id: row.post.user.id } : undefined,
    },
    user: { id: row.user.id },
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
