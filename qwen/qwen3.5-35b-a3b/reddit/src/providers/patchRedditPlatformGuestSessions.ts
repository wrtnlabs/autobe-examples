import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberSession";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformMemberSessionAtSummaryTransformer } from "../transformers/RedditPlatformMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformGuestSessions(props: {
  guest: GuestPayload;
  body: IRedditPlatformMemberSession.IRequest;
}): Promise<IPageIRedditPlatformMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  ) as string & tags.Format<"date-time">;
  // Build WHERE clause based on filters
  const whereInput: Prisma.reddit_platform_member_sessionsWhereInput = {
    member_id: props.guest.id,
  };
  // Status filter: active (not expired) or expired
  if (props.body.status === "active") {
    whereInput.expired_at = { gt: now };
  } else if (props.body.status === "expired") {
    whereInput.expired_at = { lte: now };
  }
  // Date range filters
  if (props.body.created_since) {
    whereInput.created_at =
      whereInput.created_at !== null &&
      typeof whereInput.created_at === "object"
        ? { ...whereInput.created_at, gte: props.body.created_since }
        : { gte: props.body.created_since };
  }
  if (props.body.created_before) {
    whereInput.created_at =
      whereInput.created_at !== null &&
      typeof whereInput.created_at === "object"
        ? { ...whereInput.created_at, lte: props.body.created_before }
        : { lte: props.body.created_before };
  }
  if (props.body.expired_since) {
    whereInput.expired_at =
      whereInput.expired_at !== null &&
      typeof whereInput.expired_at === "object"
        ? { ...whereInput.expired_at, gte: props.body.expired_since }
        : { gte: props.body.expired_since };
  }
  if (props.body.expired_before) {
    whereInput.expired_at =
      whereInput.expired_at !== null &&
      typeof whereInput.expired_at === "object"
        ? { ...whereInput.expired_at, lte: props.body.expired_before }
        : { lte: props.body.expired_before };
  }
  // IP address substring match (case-insensitive)
  if (props.body.ip) {
    whereInput.ip = { contains: props.body.ip, mode: "insensitive" };
  }
  // href substring match (case-insensitive)
  if (props.body.href !== null && props.body.href !== undefined) {
    whereInput.href = { contains: props.body.href, mode: "insensitive" };
  }
  // referrer substring match (case-insensitive)
  if (props.body.referrer !== null && props.body.referrer !== undefined) {
    whereInput.referrer = {
      contains: props.body.referrer,
      mode: "insensitive",
    };
  }
  // OrderBy configuration
  const orderByKey =
    props.body.sort === "expired_at" ? "expired_at" : "created_at";
  const orderDirection: "asc" | "desc" =
    props.body.direction === "ASC" ? "asc" : "desc";
  const orderByInput: {
    [key: string]: "asc" | "desc";
  } = {
    [orderByKey]: orderDirection,
  };
  // Query sessions
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_member_sessions.findMany({
      where: whereInput,
      orderBy:
        orderByInput as Prisma.reddit_platform_member_sessionsOrderByWithRelationInput,
      skip,
      take: limit,
      ...RedditPlatformMemberSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_member_sessions.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformMemberSessionAtSummaryTransformer.transform,
    ),
  };
}
