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
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function patchRedditCommunityRegisteredUserRedditCommunityPostsPostIdCommentsCommentIdCommentVotes(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.IRequest;
}): Promise<IPageIRedditCommunityCommentVote.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  let whereClause: {
    reddit_community_comment_id: string & tags.Format<"uuid">;
    deleted_at: null | undefined;
    AND?: Array<{ OR?: { vote_type: { contains: string } }[] }> | undefined;
  } = {
    reddit_community_comment_id: props.commentId,
    deleted_at: null,
    AND: [] as Array<{ OR?: { vote_type: { contains: string } }[] }>,
  };

  if (props.body.search) {
    whereClause.AND ??= [];
    whereClause.AND.push({
      OR: [{ vote_type: { contains: props.body.search } }],
    });
  }

  if (whereClause.AND && whereClause.AND.length === 0) {
    whereClause.AND = undefined;
  }

  const [votes, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comment_votes.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: props.body.orderBy
        ? { [props.body.orderBy]: props.body.orderDirection ?? "asc" }
        : { created_at: "desc" },
      include: {},
    }),
    MyGlobal.prisma.reddit_community_comment_votes.count({
      where: whereClause,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: votes.map((vote) => ({
      id: vote.id,
      vote_type: vote.vote_type,
      created_at: toISOStringSafe(vote.created_at),
      deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : null,
      reddit_community_comment: {
        id: vote.reddit_community_comment_id satisfies string as string,
        content_snippet: "",
        created_at: "",
        author: {
          id: "",
          email: "",
          created_at: "",
          updated_at: "",
          deleted_at: "",
        },
      },
      reddit_community_registereduser: {
        id: vote.reddit_community_registereduser_id satisfies string as string,
        email: "",
        created_at: "",
        updated_at: "",
        deleted_at: "",
      },
    })),
  } satisfies IPageIRedditCommunityCommentVote.ISummary;
}
