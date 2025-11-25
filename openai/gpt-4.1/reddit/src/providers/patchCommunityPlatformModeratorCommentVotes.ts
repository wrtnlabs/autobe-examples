import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorCommentVotes(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommentVote.IRequest;
}): Promise<IPageICommunityPlatformCommentVote.ISummary> {
  const page = props.body.page !== undefined ? props.body.page : 1;
  const limit = props.body.limit !== undefined ? props.body.limit : 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (props.body.vote_type !== undefined) {
    where.vote_type = props.body.vote_type;
  }
  if (props.body.comment_id !== undefined) {
    where.comment_id = props.body.comment_id;
  }
  if (props.body.user_id !== undefined) {
    where.user_id = props.body.user_id;
  }
  if (props.body.active_only === true) {
    where.deleted_at = null;
  }
  if (
    props.body.created_after !== undefined ||
    props.body.created_before !== undefined
  ) {
    const createdAt: Record<string, string> = {};
    if (props.body.created_after !== undefined) {
      createdAt.gte = props.body.created_after;
    }
    if (props.body.created_before !== undefined) {
      createdAt.lte = props.body.created_before;
    }
    where.created_at = createdAt;
  }
  if (
    props.body.updated_after !== undefined ||
    props.body.updated_before !== undefined
  ) {
    const updatedAt: Record<string, string> = {};
    if (props.body.updated_after !== undefined) {
      updatedAt.gte = props.body.updated_after;
    }
    if (props.body.updated_before !== undefined) {
      updatedAt.lte = props.body.updated_before;
    }
    where.updated_at = updatedAt;
  }

  const sortField =
    props.body.sort_by !== undefined ? props.body.sort_by : "created_at";
  const sortOrder =
    props.body.sort_order !== undefined ? props.body.sort_order : "desc";

  const [votes, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comment_votes.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortOrder },
      include: {
        comment: {
          include: {
            user: true,
            post: true,
          },
        },
        user: true,
      },
    }),
    MyGlobal.prisma.community_platform_comment_votes.count({ where }),
  ]);

  return {
    data: votes.map((vote) => ({
      id: vote.id,
      vote_type: typia.assert<"up" | "down">(vote.vote_type),
      created_at:
        typeof vote.created_at === "string"
          ? vote.created_at
          : toISOStringSafe(vote.created_at),
      comment: {
        id: vote.comment.id,
        user: {
          id: vote.comment.user.id,
        },
        post: {
          id: vote.comment.post.id,
          community_id: vote.comment.post.community_id,
          user_id: vote.comment.post.user_id,
        },
        parent_id:
          vote.comment.parent_id === null ? undefined : vote.comment.parent_id,
        created_at:
          typeof vote.comment.created_at === "string"
            ? vote.comment.created_at
            : toISOStringSafe(vote.comment.created_at),
      },
      user: {
        id: vote.user.id,
      },
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
  };
}
