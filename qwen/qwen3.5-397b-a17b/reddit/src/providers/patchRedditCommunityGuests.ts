import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityGuestAtSummaryTransformer } from "../transformers/RedditCommunityGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityGuests(props: {
  body: IRedditCommunityGuest.IRequest;
}): Promise<IPageIRedditCommunityGuest.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.search !== undefined && {
      device_fingerprint: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.deleted !== undefined && {
      deleted_at: props.body.deleted ? { not: null } : null,
    }),
  } satisfies Prisma.reddit_community_guestsWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const sortDirection: "asc" | "desc" = props.body.direction ?? "desc";
  const orderByInput = {
    [sortField]: sortDirection,
  } satisfies Prisma.reddit_community_guestsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_community_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_guests.count({
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
      RedditCommunityGuestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityGuest.ISummary;
}
