import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostVote";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostVoteAtSummaryTransformer } from "../transformers/RedditPlatformPostVoteAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformPostVotes(props: {
  body: IRedditPlatformPostVote.IRequest;
}): Promise<IPageIRedditPlatformPostVote.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const sort_by = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";
  const include_deleted = props.body.include_deleted ?? false;
  const cursor = props.body.cursor;
  const whereInput: Prisma.reddit_platform_post_votesWhereInput = {};
  if (props.body.user_id) {
    whereInput.user_id = props.body.user_id;
  }
  if (props.body.post_id) {
    whereInput.post_id = props.body.post_id;
  }
  if (props.body.vote_type) {
    if (props.body.vote_type === "NULL") {
      whereInput.deleted_at = {
        not: null,
      };
    } else {
      whereInput.vote_type = props.body.vote_type;
    }
  } else if (!include_deleted) {
    whereInput.deleted_at = null;
  }
  if (props.body.created_at_range) {
    whereInput.created_at = {};
    if (props.body.created_at_range.start) {
      whereInput.created_at.gte = props.body.created_at_range.start;
    }
    if (props.body.created_at_range.end) {
      whereInput.created_at.lte = props.body.created_at_range.end;
    }
  }
  if (props.body.updated_at_range) {
    whereInput.updated_at = {};
    if (props.body.updated_at_range.start) {
      whereInput.updated_at.gte = props.body.updated_at_range.start;
    }
    if (props.body.updated_at_range.end) {
      whereInput.updated_at.lte = props.body.updated_at_range.end;
    }
  }
  const orderBy: Prisma.reddit_platform_post_votesOrderByWithRelationInput[] =
    [];
  if (sort_by === "created_at") {
    orderBy.push({
      created_at: order,
    });
  } else if (sort_by === "updated_at") {
    orderBy.push({
      updated_at: order,
    });
  } else if (sort_by === "user_id") {
    orderBy.push({
      user_id: order,
    });
  } else if (sort_by === "post_id") {
    orderBy.push({
      post_id: order,
    });
  }
  let skip = 0;
  let take = limit;
  if (cursor) {
    const decodedCursor = Buffer.from(cursor, "base64").toString("utf-8");
    if (order === "asc") {
      whereInput.created_at = Object.assign({}, whereInput.created_at ?? {}, {
        gt: decodedCursor,
      });
    } else {
      whereInput.created_at = Object.assign({}, whereInput.created_at ?? {}, {
        lt: decodedCursor,
      });
    }
  } else {
    skip = (page - 1) * limit;
  }
  const data = await MyGlobal.prisma.reddit_platform_post_votes.findMany({
    where: whereInput,
    ...(skip > 0 && { skip }),
    ...(take > 0 && { take }),
    orderBy: orderBy.length > 0 ? orderBy : [{ created_at: order }],
    ...RedditPlatformPostVoteAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_post_votes.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditPlatformPostVoteAtSummaryTransformer.transform,
  );
  const has_next = data.length === limit;
  let next_cursor: string | undefined;
  if (has_next && data.length > 0) {
    const last_item = data[data.length - 1];
    next_cursor = Buffer.from(last_item.created_at).toString("base64");
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditPlatformPostVote.ISummary;
}
