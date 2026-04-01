import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMembers(props: {
  body: IRedditCommunityMember.IRequest;
}): Promise<IPageIRedditCommunityMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const searchCondition = props.body.search
    ? {
        OR: [
          {
            username: {
              contains: props.body.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            email: {
              contains: props.body.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }
    : {};
  const dateConditions = {
    ...(props.body.created_from !== undefined && {
      created_at: { gte: new Date(props.body.created_from) },
    }),
    ...(props.body.created_to !== undefined && {
      created_at: { lte: new Date(props.body.created_to) },
    }),
  };
  const statusCondition =
    props.body.status === "deleted"
      ? { deleted_at: { not: null } }
      : props.body.status === "active"
        ? { deleted_at: null }
        : {};
  const whereInput: Prisma.reddit_community_membersWhereInput = {
    ...searchCondition,
    ...dateConditions,
    ...statusCondition,
  };
  const sortOrder: Prisma.SortOrder = props.body.sortOrder ?? "asc";
  const orderByInput =
    props.body.sortBy === "username"
      ? { username: sortOrder }
      : { created_at: sortOrder };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_members.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityMemberAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_members.count({ where: whereInput }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityMemberAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCommunityMember.ISummary;
}
