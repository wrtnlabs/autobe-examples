import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommentVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerator";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteOfModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommentVotesModerators(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommentVoteOfModerator.IRequest;
}): Promise<IPageICommunityPlatformCommentVoteOfModerator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null as null | undefined,
    ...(props.body.moderatorId && { moderator_id: props.body.moderatorId }),
    ...(props.body.commentVoteId && {
      comment_vote_id: props.body.commentVoteId,
    }),
    ...(props.body.vote && { vote: props.body.vote }),
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom && { gte: props.body.createdAtFrom }),
            ...(props.body.createdAtTo && { lte: props.body.createdAtTo }),
          },
        }
      : {}),
  } satisfies Prisma.community_platform_comment_vote_of_moderatorsWhereInput;
  const data =
    await MyGlobal.prisma.community_platform_comment_vote_of_moderators.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          vote: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          commentVote: {
            select: {
              id: true,
              community_platform_comment_id: true,
              vote_type: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          moderator: {
            select: {
              id: true,
              email: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    );
  const total =
    await MyGlobal.prisma.community_platform_comment_vote_of_moderators.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: await Promise.all(
      data.map(async (vote) => ({
        id: String(vote.id) satisfies string & tags.Format<"uuid">,
        vote: vote.vote,
        created_at: toISOStringSafe(vote.created_at) satisfies string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(vote.updated_at) satisfies string &
          tags.Format<"date-time">,
        deleted_at: (vote.deleted_at
          ? toISOStringSafe(vote.deleted_at)
          : null) satisfies (string & tags.Format<"date-time">) | null,
        commentVote: {
          id: String(vote.commentVote.id) satisfies string &
            tags.Format<"uuid">,
          communityPlatformCommentId: String(
            vote.commentVote.community_platform_comment_id,
          ) satisfies string & tags.Format<"uuid">,
          voteType: vote.commentVote.vote_type,
          createdAt: toISOStringSafe(
            vote.commentVote.created_at,
          ) satisfies string & tags.Format<"date-time">,
          updatedAt: toISOStringSafe(
            vote.commentVote.updated_at,
          ) satisfies string & tags.Format<"date-time">,
          deletedAt: (vote.commentVote.deleted_at
            ? toISOStringSafe(vote.commentVote.deleted_at)
            : null) satisfies (string & tags.Format<"date-time">) | null,
        },
        moderator: {
          id: String(vote.moderator.id) satisfies string & tags.Format<"uuid">,
          email: vote.moderator.email,
          username: vote.moderator.username,
          display_name: vote.moderator.display_name ?? undefined,
          bio: vote.moderator.bio ?? undefined,
          avatar_url: vote.moderator.avatar_url ?? undefined,
          karma: vote.moderator.karma,
          created_at: toISOStringSafe(
            vote.moderator.created_at,
          ) satisfies string & tags.Format<"date-time">,
          updated_at: toISOStringSafe(
            vote.moderator.updated_at,
          ) satisfies string & tags.Format<"date-time">,
          deleted_at: (vote.moderator.deleted_at
            ? toISOStringSafe(vote.moderator.deleted_at)
            : null) satisfies (string & tags.Format<"date-time">) | null,
        },
      })),
    ),
  };
}
