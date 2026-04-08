import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeVote";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeVoteAtSummaryTransformer } from "../transformers/RedditLikeVoteAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberVotes(props: {
  member: MemberPayload;
  body: IRedditLikeVote.IRequest;
}): Promise<IPageIRedditLikeVote.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const skip: number = (page - 1) * limit;
  const baseWhere: Prisma.reddit_like_votesWhereInput = {
    reddit_like_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.vote_type !== undefined && {
      vote_type: props.body.vote_type,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: props.body.created_at_to },
    }),
  };
  const contentWhere: Prisma.reddit_like_votesWhereInput | undefined =
    props.body.content_type !== undefined
      ? props.body.content_type === "post"
        ? { reddit_like_post_id: { not: null } }
        : props.body.content_type === "comment"
          ? { reddit_like_comment_id: { not: null } }
          : undefined
      : undefined;
  const whereInput: Prisma.reddit_like_votesWhereInput = contentWhere
    ? { AND: [baseWhere, contentWhere] }
    : baseWhere;
  const orderByInput: Prisma.reddit_like_votesOrderByWithRelationInput = {
    created_at: "desc",
    id: "desc",
  };
  let cursorWhere: Prisma.reddit_like_votesWhereInput | undefined;
  if (props.body.cursor !== undefined) {
    try {
      const cursorData: {
        created_at: string;
        id: string;
      } = JSON.parse(Buffer.from(props.body.cursor, "base64").toString());
      cursorWhere = {
        OR: [
          { created_at: { lt: cursorData.created_at } },
          {
            created_at: cursorData.created_at,
            id: { lt: cursorData.id },
          },
        ],
      };
    } catch {
      cursorWhere = undefined;
    }
  }
  const finalWhere: Prisma.reddit_like_votesWhereInput = cursorWhere
    ? { AND: [whereInput, cursorWhere] }
    : whereInput;
  const records = await MyGlobal.prisma.reddit_like_votes.findMany({
    where: finalWhere,
    orderBy: orderByInput,
    skip: cursorWhere !== undefined ? undefined : skip,
    take: limit,
    ...RedditLikeVoteAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.reddit_like_votes.count({
    where: finalWhere,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    RedditLikeVoteAtSummaryTransformer.transform,
  );
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination: pagination,
    data: data,
  } satisfies IPageIRedditLikeVote.ISummary;
}
