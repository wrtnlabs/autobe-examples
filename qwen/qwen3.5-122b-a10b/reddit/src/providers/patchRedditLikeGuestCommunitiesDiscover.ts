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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditLikeCommunityAtSummaryTransformer } from "../transformers/RedditLikeCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestCommunitiesDiscover(props: {
  guest: GuestPayload;
  body: IRedditLikeCommunity.IRequest;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  // Parse pagination parameters with defaults
  const page: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.body.page ?? 1;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.body.limit ?? 100;
  const offset: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.body.offset ?? (page - 1) * limit;
  // Build where clause with soft-delete filter and optional search
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
  // Build order by based on sort parameters
  const orderByInput: Prisma.reddit_like_communitiesOrderByWithRelationInput =
    props.body.sort_by === "subscriber_count"
      ? {
          memberSubscriptions: {
            _count: props.body.sort_order === "asc" ? "asc" : "desc",
          },
        }
      : props.body.sort_by === "name"
        ? {
            name: props.body.sort_order === "asc" ? "asc" : "desc",
          }
        : {
            created_at: props.body.sort_order === "asc" ? "asc" : "desc",
          };
  // Get paginated records
  const records = await MyGlobal.prisma.reddit_like_communities.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: offset,
    take: limit,
    ...RedditLikeCommunityAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_like_communities.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      RedditLikeCommunityAtSummaryTransformer.transform,
    ),
  };
}
