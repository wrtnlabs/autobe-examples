import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneGuestSession";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCloneGuestSessionAtSummaryTransformer } from "../transformers/RedditCloneGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneGuestGuestSessions(props: {
  guest: GuestPayload;
  body: IRedditCloneGuestSession.IRequest;
}): Promise<IPageIRedditCloneGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_guest_sessionsWhereInput = {};
  if (props.body.guest_id !== undefined) {
    whereInput.reddit_clone_guest_id = props.body.guest_id;
  }
  if (props.body.ip !== undefined) {
    whereInput.ip = props.body.ip;
  }
  if (props.body.href !== undefined) {
    whereInput.href = props.body.href;
  }
  if (props.body.created_after !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.created_after),
    };
  }
  if (props.body.created_before !== undefined) {
    const hasGte =
      whereInput.created_at !== undefined &&
      typeof whereInput.created_at === "object" &&
      "gte" in whereInput.created_at;
    whereInput.created_at = {
      ...(hasGte && typeof whereInput.created_at === "object"
        ? { gte: (whereInput.created_at as any).gte }
        : {}),
      lt: new Date(props.body.created_before),
    };
  }
  if (props.body.expired !== undefined) {
    const now = new Date();
    if (props.body.expired === true) {
      whereInput.expired_at = {
        lt: now,
      };
    } else {
      whereInput.expired_at = {
        gte: now,
      };
    }
  }
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = (props.body.order ?? "desc") as "asc" | "desc";
  const orderByInput: Prisma.reddit_clone_guest_sessionsOrderByWithRelationInput =
    {
      [sortField]: sortOrder,
    };
  const data = await MyGlobal.prisma.reddit_clone_guest_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneGuestSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_guest_sessions.count({
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
      RedditCloneGuestSessionAtSummaryTransformer.transform,
    ),
  };
}
