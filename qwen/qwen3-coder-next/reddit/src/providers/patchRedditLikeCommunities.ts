import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunities(props: {
  body: IRedditLikeCommunity.IRequest;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
  } satisfies Prisma.reddit_like_communitiesWhereInput;
  const data = await MyGlobal.prisma.reddit_like_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: (props.body.sort === "created_at"
      ? { created_at: "asc" }
      : props.body.sort === "created_at_desc"
        ? { created_at: "desc" }
        : {
            created_at: "desc",
          }) satisfies Prisma.reddit_like_communitiesOrderByWithRelationInput,
  });
  const total = await MyGlobal.prisma.reddit_like_communities.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      name: record.name,
      icon_url: record.icon_url,
      subscriber_count: (record as any).subscriber_count as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditLikeCommunity.ISummary;
}
