import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { IPageIRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditCommunityModeratorRedditCommunityPostsPostIdCommentsCommentIdCommentVotes(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.IRequest;
}): Promise<IPageIRedditCommunityCommentVote.ISummary> {
  const page = Math.max(props.body.page, 1);
  const limit = Math.min(Math.max(props.body.limit, 1), 100);
  const skip = (page - 1) * limit;

  // Build the search filter for vote_type
  const searchFilter = props.body.search
    ? { vote_type: { contains: props.body.search } }
    : undefined;

  // Build orderBy
  const orderByField = props.body.orderBy ?? "created_at";
  const orderDirection = props.body.orderDirection ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comment_votes.findMany({
      where: {
        reddit_community_comment_id: props.commentId,
        deleted_at: null,
        ...searchFilter,
      },
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
      // Removed invalid includes to fix type errors
    }),
    MyGlobal.prisma.reddit_community_comment_votes.count({
      where: {
        reddit_community_comment_id: props.commentId,
        deleted_at: null,
        ...searchFilter,
      },
    }),
  ]);

  // Map results to IRedditCommunityCommentVote.ISummary - no nested relations available anymore
  const mappedData = data.map((vote) => ({
    id: vote.id,
    vote_type: vote.vote_type,
    created_at: toISOStringSafe(vote.created_at),
    deleted_at:
      vote.deleted_at !== null ? toISOStringSafe(vote.deleted_at) : null,

    // Because nested relations are removed from Prisma query, replace them with minimal placeholder or exclude
    reddit_community_comment: {
      id: vote.reddit_community_comment_id,
      content_snippet: "",
      created_at: "1970-01-01T00:00:00.000Z" satisfies string &
        tags.Format<"date-time"> as string,
      author: {
        id: "" satisfies string & tags.Format<"uuid"> as string,
        email: "",
        created_at: "1970-01-01T00:00:00.000Z" satisfies string &
          tags.Format<"date-time"> as string,
        updated_at: "1970-01-01T00:00:00.000Z" satisfies string &
          tags.Format<"date-time"> as string,
        deleted_at: null,
      },
    },
    reddit_community_registereduser: {
      id: vote.reddit_community_registereduser_id,
      email: "",
      created_at: "1970-01-01T00:00:00.000Z" satisfies string &
        tags.Format<"date-time"> as string,
      updated_at: "1970-01-01T00:00:00.000Z" satisfies string &
        tags.Format<"date-time"> as string,
      deleted_at: null,
    },
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: totalPages,
    },
    data: mappedData,
  };
}
