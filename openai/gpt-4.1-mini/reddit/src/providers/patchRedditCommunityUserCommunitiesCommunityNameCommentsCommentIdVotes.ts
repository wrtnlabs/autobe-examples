import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { IPageIRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchRedditCommunityUserCommunitiesCommunityNameCommentsCommentIdVotes(props: {
  user: UserPayload;
  communityName: string;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.IRequest;
}): Promise<IPageIRedditCommunityCommentVote.ISummary> {
  const { user, communityName, commentId, body } = props;

  const page = (body.page ?? 1) >= 1 ? (body.page ?? 1) : 1;
  const limit = (body.limit ?? 10) >= 1 ? (body.limit ?? 10) : 10;
  const skip = (page - 1) * limit;

  const where = {
    reddit_community_comment_id: commentId,
    ...(body.vote_type !== undefined &&
      body.vote_type !== null && {
        vote_type: body.vote_type,
      }),
    community: {
      name: communityName,
    },
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.trim() !== "" && {
        user: {
          email: {
            contains: body.search,
          },
        },
      }),
  };

  const orderBy = {
    created_at: (body.sort_order === "asc" ? "asc" : "desc") satisfies
      | "asc"
      | "desc" as "asc" | "desc",
  };

  const [votes, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comment_votes.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        reddit_community_comment_id: true,
        reddit_community_user_id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_comment_votes.count({ where }),
  ]);

  const data = votes.map((vote) => ({
    id: vote.id,
    reddit_community_comment_id: vote.reddit_community_comment_id,
    reddit_community_user_id: vote.reddit_community_user_id,
    vote_type: vote.vote_type,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  }));

  // Fix the pagination numbers by satisfying base number and assigning to the typed pagination properties
  const current = page satisfies number as number;
  const limitFixed = limit satisfies number as number;

  const pagination = {
    current: current as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: limitFixed as number & tags.Type<"int32"> & tags.Minimum<0>,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
