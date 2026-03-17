import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeGuest";
import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeGuestAtSummaryTransformer } from "../transformers/RedditLikeGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuests(props: {
  body: IRedditLikeGuest.IRequest;
}): Promise<IPageIRedditLikeGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.deviceFingerprint !== undefined && {
      device_fingerprint: { contains: props.body.deviceFingerprint },
    }),
    ...(props.body.createdAtFrom !== undefined &&
      props.body.createdAtFrom !== null && {
        created_at: { gte: new Date(props.body.createdAtFrom) },
      }),
    ...(props.body.createdAtTo !== undefined &&
      props.body.createdAtTo !== null && {
        created_at: { lte: new Date(props.body.createdAtTo) },
      }),
    ...(props.body.updatedAtFrom !== undefined &&
      props.body.updatedAtFrom !== null && {
        updated_at: { gte: new Date(props.body.updatedAtFrom) },
      }),
    ...(props.body.updatedAtTo !== undefined &&
      props.body.updatedAtTo !== null && {
        updated_at: { lte: new Date(props.body.updatedAtTo) },
      }),
    ...(props.body.includeExpired !== true && {
      deleted_at: null,
    }),
  } satisfies Prisma.reddit_like_guestsWhereInput;
  const orderByInput = (
    props.body.sortBy === "deviceFingerprint"
      ? { device_fingerprint: props.body.sortOrder ?? "asc" }
      : props.body.sortBy === "updatedAt"
        ? { updated_at: props.body.sortOrder ?? "desc" }
        : { created_at: props.body.sortOrder ?? "desc" }
  ) satisfies Prisma.reddit_like_guestsOrderByWithRelationInput;
  const guests = await MyGlobal.prisma.reddit_like_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditLikeGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_guests.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    guests,
    RedditLikeGuestAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
