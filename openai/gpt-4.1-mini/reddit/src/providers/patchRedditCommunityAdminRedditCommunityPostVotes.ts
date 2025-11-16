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
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityPostVotes(props: {
  admin: AdminPayload;
  body: IRedditCommunityPostVote.IRequest;
}): Promise<IPageIRedditCommunityPostVote.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) throw new HttpException("Page must be at least 1", 400);
  if (limit < 1 || limit > 100)
    throw new HttpException("Limit must be between 1 and 100", 400);

  const skip = (page - 1) * limit;
  const take = limit;

  const search = props.body.search?.trim() ?? undefined;

  const where: Prisma.reddit_community_post_votesWhereInput = {};

  if (search) {
    where.OR = [{ reddit_community_post_id: search }];
  }

  const orderBy: Record<string, "asc" | "desc"> = {};
  if (props.body.orderBy) {
    orderBy[props.body.orderBy] =
      props.body.orderDirection === "desc" ? "desc" : "asc";
  } else {
    orderBy["created_at"] = "desc";
  }

  const total = await MyGlobal.prisma.reddit_community_post_votes.count({
    where,
  });

  const data = await MyGlobal.prisma.reddit_community_post_votes.findMany({
    where,
    skip,
    take,
    orderBy,
  });

  return {
    data: data.map((item) => ({
      id: item.id,
      post_id: item.reddit_community_post_id,
      voter: {
        id: item.reddit_community_registered_user_id,
        username: "",
        profile_image_url: undefined,
      },
      direction: item.vote_type === "upvote" ? 1 : -1,
      created_at: toISOStringSafe(item.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
