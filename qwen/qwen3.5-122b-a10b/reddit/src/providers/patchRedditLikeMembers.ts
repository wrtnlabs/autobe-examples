import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeMemberAtSummaryTransformer } from "../transformers/RedditLikeMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMembers(props: {
  body: IRedditLikeMember.IRequest;
}): Promise<IPageIRedditLikeMember.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const baseWhere: Prisma.reddit_like_membersWhereInput = {
    deleted_at: null,
  };
  if (
    props.body.username !== undefined &&
    props.body.username !== null &&
    props.body.username.length > 0
  ) {
    baseWhere.username = {
      contains: props.body.username,
      mode: "insensitive",
    };
  }
  const created_atFilter: Prisma.reddit_like_membersWhereInput["created_at"] =
    {};
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null
  ) {
    created_atFilter.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null) {
    created_atFilter.lte = new Date(props.body.createdAtTo);
  }
  if (Object.keys(created_atFilter).length > 0) {
    baseWhere.created_at = created_atFilter;
  }
  const displayNameFilter: string | undefined = props.body.displayName;
  const orderByInput: Prisma.reddit_like_membersOrderByWithRelationInput[] =
    props.body.sort !== undefined &&
    props.body.sort !== null &&
    props.body.sort.field !== undefined &&
    props.body.sort.order !== undefined
      ? [{ [props.body.sort.field]: props.body.sort.order }]
      : [{ created_at: "desc" }];
  let skip: number = 0;
  let cursor: Prisma.reddit_like_membersWhereUniqueInput | undefined =
    undefined;
  if (props.body.cursor !== undefined && props.body.cursor !== null) {
    const decoded: {
      createdAt: string;
      id: string;
    } = JSON.parse(Buffer.from(props.body.cursor, "base64").toString("utf-8"));
    cursor = { id: decoded.id };
    skip = 1;
  } else if (page > 1) {
    skip = (page - 1) * limit;
  }
  const finalWhere: Prisma.reddit_like_membersWhereInput =
    displayNameFilter !== undefined &&
    displayNameFilter !== null &&
    displayNameFilter.length > 0
      ? {
          ...baseWhere,
          userProfile: {
            display_name: {
              contains: displayNameFilter,
              mode: "insensitive",
            },
          },
        }
      : baseWhere;
  const records = await MyGlobal.prisma.reddit_like_members.findMany({
    where: finalWhere,
    orderBy: orderByInput,
    skip,
    take: limit + 1,
    ...RedditLikeMemberAtSummaryTransformer.select(),
  });
  const hasMore: boolean = records.length > limit;
  if (hasMore) {
    records.pop();
  }
  const total: number = await MyGlobal.prisma.reddit_like_members.count({
    where: finalWhere,
  });
  const nextCursor: string | null =
    hasMore && records.length > 0
      ? Buffer.from(
          JSON.stringify({
            createdAt: toISOStringSafe(records[records.length - 1].created_at),
            id: records[records.length - 1].id,
          }),
        ).toString("base64")
      : null;
  const result: IPageIRedditLikeMember.ISummary = {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditLikeMemberAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditLikeMember.ISummary;
  return result;
}
