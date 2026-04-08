import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneGuest";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneGuestAtSummaryTransformer } from "../transformers/RedditCloneGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneGuests(props: {
  body: IRedditCloneGuest.IRequest;
}): Promise<IPageIRedditCloneGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_guestsWhereInput = {};
  // Device fingerprint filter (partial match using contains)
  if (props.body.deviceFingerprint !== undefined) {
    whereInput.device_fingerprint = {
      contains: props.body.deviceFingerprint,
    };
  }
  // Created at date range filter
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (props.body.createdAtFrom !== undefined) {
    createdAtFilter.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo !== undefined) {
    createdAtFilter.lte = new Date(props.body.createdAtTo);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereInput.created_at = createdAtFilter;
  }
  // Updated at date range filter
  const updatedAtFilter: Prisma.DateTimeFilter = {};
  if (props.body.updatedAtFrom !== undefined) {
    updatedAtFilter.gte = new Date(props.body.updatedAtFrom);
  }
  if (props.body.updatedAtTo !== undefined) {
    updatedAtFilter.lte = new Date(props.body.updatedAtTo);
  }
  if (Object.keys(updatedAtFilter).length > 0) {
    whereInput.updated_at = updatedAtFilter;
  }
  // Deleted at filter (null for active guests, non-null for deleted)
  if (props.body.deletedAt !== undefined) {
    if (props.body.deletedAt === null) {
      whereInput.deleted_at = null;
    } else {
      whereInput.deleted_at = {
        not: null,
      };
    }
  }
  // Build orderBy clause based on sortBy and sortOrder
  const orderByInput: Prisma.reddit_clone_guestsOrderByWithRelationInput = {
    ...(props.body.sortBy === "createdAt"
      ? { created_at: props.body.sortOrder ?? "desc" }
      : { updated_at: props.body.sortOrder ?? "desc" }),
  };
  const data = await MyGlobal.prisma.reddit_clone_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_guests.count({
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
      RedditCloneGuestAtSummaryTransformer.transform,
    ),
  };
}
