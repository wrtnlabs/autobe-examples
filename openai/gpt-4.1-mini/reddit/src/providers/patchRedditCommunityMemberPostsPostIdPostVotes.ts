import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { IPageIRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchRedditCommunityMemberPostsPostIdPostVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.IRequest;
}): Promise<IPageIRedditCommunityPostVote.ISummary> {
  const { member, postId, body } = props;

  const postExists = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (postExists === null) {
    throw new HttpException("Not Found: Post does not exist", 404);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    post_id: postId,
    ...(body.member_id !== undefined &&
      body.member_id !== null && { member_id: body.member_id }),
    ...(body.vote_value !== undefined && { vote_value: body.vote_value }),
    ...(body.deleted_at !== undefined &&
      body.deleted_at !== null && { deleted_at: body.deleted_at }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && { created_at: { gte: body.created_at } }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && { updated_at: { gte: body.updated_at } }),
  };

  const [total, votes] = await Promise.all([
    MyGlobal.prisma.reddit_community_post_votes.count({ where }),
    MyGlobal.prisma.reddit_community_post_votes.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        member_id: true,
        post_id: true,
        vote_value: true,
        created_at: true,
        updated_at: true,
      },
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
      member_id: vote.member_id,
      post_id: vote.post_id,
      vote_value: vote.vote_value,
      created_at: toISOStringSafe(vote.created_at),
      updated_at: toISOStringSafe(vote.updated_at),
    })),
  };
}
