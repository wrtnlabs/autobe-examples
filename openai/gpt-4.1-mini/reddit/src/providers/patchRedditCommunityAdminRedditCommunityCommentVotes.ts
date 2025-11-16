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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityCommentVotes(props: {
  admin: AdminPayload;
  body: IRedditCommunityCommentVote.IRequest;
}): Promise<IPageIRedditCommunityCommentVote.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where: Prisma.reddit_community_comment_votesWhereInput = {
    ...(props.body.redditCommunityCommentId && {
      reddit_community_comment_id: props.body
        .redditCommunityCommentId satisfies string as string,
    }),
    ...(props.body.voterUserId && {
      voter_user_id: props.body.voterUserId satisfies string as string,
    }),
    ...(props.body.voteType
      ? props.body.voteType === "upvote"
        ? { vote_type: "upvote" }
        : { vote_type: "downvote" }
      : undefined),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comment_votes.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        reddit_community_comment_id: true,
        vote_type: true,
      },
    }),
    MyGlobal.prisma.reddit_community_comment_votes.count({ where }),
  ]);

  return {
    data: results.map((record) => ({
      id: record.id,
      comment_id: record.reddit_community_comment_id,
      vote: record.vote_type === "upvote" ? 1 : -1,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
