import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformGuest";
import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformGuestAtSummaryTransformer } from "../transformers/RedditPlatformGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformGuests(props: {
  body: IRedditPlatformGuest.IRequest;
}): Promise<IPageIRedditPlatformGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_guestsWhereInput = {
    deleted_at: null,
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
    ...(props.body.username !== undefined && {
      username: { contains: props.body.username, mode: "insensitive" as const },
    }),
    ...(props.body.displayName !== undefined && {
      display_name: {
        contains: props.body.displayName,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.minKarma !== undefined && {
      karma: { gte: props.body.minKarma },
    }),
    ...(props.body.maxKarma !== undefined && {
      karma: { lte: props.body.maxKarma },
    }),
  } satisfies Prisma.reddit_platform_guestsWhereInput;
  const orderByInput = (
    props.body.sortBy === "updatedAt"
      ? { updated_at: props.body.sortOrder === "asc" ? "asc" : "desc" }
      : props.body.sortBy === "karma"
        ? { karma: props.body.sortOrder === "asc" ? "asc" : "desc" }
        : { created_at: props.body.sortOrder === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.reddit_platform_guestsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_platform_guests.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditPlatformGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_guests.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformGuestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
