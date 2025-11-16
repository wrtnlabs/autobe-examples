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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorPostVotes(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformPostVote.IRequest;
}): Promise<IPageICommunityPlatformPostVote.ISummary> {
  const {
    post_id,
    user_id,
    vote_type,
    created_from,
    created_to,
    include_deleted,
    page,
    limit,
    sort_by,
    sort_order,
  } = props.body;

  const pageNum = page && typeof page === "number" ? page : 1;
  const perPage = limit && typeof limit === "number" ? limit : 100;
  const skip = (pageNum - 1) * perPage;

  const whereClause: Record<string, any> = {
    ...(post_id ? { post_id } : {}),
    ...(user_id ? { user_id } : {}),
    ...(vote_type ? { vote_type } : {}),
    ...(created_from || created_to
      ? {
          created_at: {
            ...(created_from ? { gte: created_from } : {}),
            ...(created_to ? { lte: created_to } : {}),
          },
        }
      : {}),
    ...(include_deleted ? {} : { deleted_at: null }),
  };

  let orderBy: any = { created_at: "desc" };
  if (sort_by === "updated_at") {
    orderBy = { updated_at: sort_order === "asc" ? "asc" : "desc" };
  } else if (sort_by === "vote_type") {
    orderBy = { vote_type: sort_order === "asc" ? "asc" : "desc" };
  } else if (sort_by === "created_at") {
    orderBy = { created_at: sort_order === "asc" ? "asc" : "desc" };
  }

  const [votes, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_votes.findMany({
      where: whereClause,
      skip,
      take: perPage,
      orderBy,
      include: {
        post: {
          select: {
            id: true,
            community_id: true,
            user_id: true,
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
    MyGlobal.prisma.community_platform_post_votes.count({ where: whereClause }),
  ]);

  return {
    pagination: {
      current: pageNum,
      limit: perPage,
      records: total,
      pages: Math.ceil(total / perPage),
    },
    data: votes.map((vote) => ({
      id: vote.id,
      vote_type: typia.assert<"up" | "down">(vote.vote_type),
      created_at: toISOStringSafe(vote.created_at),
      post: {
        id: vote.post.id,
        community_id: vote.post.community_id,
        community: vote.post.community
          ? {
              id: vote.post.community.id,
              name: vote.post.community.name,
              display_title: vote.post.community.display_title,
              description: vote.post.community.description,
              visibility: vote.post.community.visibility,
              image_url: vote.post.community.image_url ?? undefined,
              status: vote.post.community.status,
            }
          : undefined,
        user_id: vote.post.user_id,
        user: vote.post.user ? { id: vote.post.user.id } : undefined,
      },
      user: vote.user ? { id: vote.user.id } : { id: "" },
    })),
  };
}
