import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityAtSummaryTransformer } from "../transformers/RedditLikeCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberCommunities(props: {
  member: MemberPayload;
  body: IRedditLikeCommunity.IRequest;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const offset = props.body.offset ?? (page - 1) * limit;
  const whereInput: Prisma.reddit_like_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== null &&
      props.body.search !== "" && {
        name: {
          contains: props.body.search,
          mode: "insensitive",
        },
      }),
  };
  const orderByInput: Prisma.reddit_like_communitiesOrderByWithRelationInput[] =
    props.body.sort_by === "subscriber_count"
      ? [
          {
            memberSubscriptions: {
              _count: props.body.sort_order === "asc" ? "asc" : "desc",
            },
          },
        ]
      : [
          {
            [props.body.sort_by ?? "created_at"]:
              props.body.sort_order ?? "desc",
          },
        ];
  const records = await MyGlobal.prisma.reddit_like_communities.findMany({
    where: whereInput,
    skip: offset,
    take: limit,
    orderBy: orderByInput,
    ...RedditLikeCommunityAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_communities.count({
    where: whereInput,
  });
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const data = await ArrayUtil.asyncMap(
    records,
    RedditLikeCommunityAtSummaryTransformer.transform,
  );
  return {
    pagination,
    data,
  };
}
