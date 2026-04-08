import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostAtSummaryTransformer } from "../transformers/RedditLikePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberFeedsHome(props: {
  member: MemberPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const limit: number = props.body.limit ?? 25;
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const page: number = props.body.page ?? 1;
  const cursor: string | undefined = props.body.cursor;
  const subscriptions =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findMany({
      where: {
        reddit_like_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        reddit_like_community_id: true,
      },
    });
  const communityIds: Array<string & tags.Format<"uuid">> = subscriptions.map(
    (s) => s.reddit_like_community_id,
  );
  if (communityIds.length === 0) {
    return {
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    } satisfies IPageIRedditLikePost.ISummary;
  }
  const whereInput: Prisma.reddit_like_postsWhereInput = {
    deleted_at: null,
    reddit_like_community_id: {
      in: communityIds,
    },
  };
  let cursorInput: Prisma.reddit_like_postsWhereUniqueInput | undefined;
  let skip: number | undefined;
  if (cursor) {
    try {
      const decoded: {
        created_at: string;
        id: string;
      } = JSON.parse(Buffer.from(cursor, "base64").toString());
      cursorInput = {
        created_at: new Date(decoded.created_at),
        id: decoded.id,
      };
      skip = 1;
    } catch {
      // Invalid cursor, ignore
    }
  }
  const select = RedditLikePostAtSummaryTransformer.select();
  const findManyOptions = {
    where: whereInput,
    orderBy: { created_at: Prisma.SortOrder.desc },
    ...select,
    ...(cursorInput
      ? { cursor: cursorInput, skip, take: limit }
      : { take: limit }),
  };
  const posts =
    await MyGlobal.prisma.reddit_like_posts.findMany(findManyOptions);
  const hasNext: boolean = posts.length > limit;
  if (hasNext) {
    posts.pop();
  }
  const total: number = await MyGlobal.prisma.reddit_like_posts.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    posts,
    RedditLikePostAtSummaryTransformer.transform,
  );
  const totalPages: number = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditLikePost.ISummary;
}
