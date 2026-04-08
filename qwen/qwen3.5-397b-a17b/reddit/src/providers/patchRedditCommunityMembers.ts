import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
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
  const whereInput = {
    deleted_at: null,
    ...(props.body.username !== undefined && {
      username: { contains: props.body.username, mode: "insensitive" as const },
    }),
    ...(props.body.displayName !== undefined && {
      display_name: {
        contains: props.body.displayName,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.karmaMin !== undefined && {
      karma: { gte: props.body.karmaMin },
    }),
    ...(props.body.karmaMax !== undefined && {
      karma: { lte: props.body.karmaMax },
    }),
    ...(props.body.createdAfter !== undefined && {
      created_at: { gte: new Date(props.body.createdAfter) },
    }),
    ...(props.body.createdBefore !== undefined && {
      created_at: { lte: new Date(props.body.createdBefore) },
    }),
  } satisfies Prisma.reddit_community_membersWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
  const orderByInput = {
    [sortField]: direction,
  } satisfies Prisma.reddit_community_membersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_community_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_members.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityMemberAtSummaryTransformer.transform,
    ),
  };
}
