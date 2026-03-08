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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchRedditPlatformGuests(props: {
  body: IRedditPlatformGuest.IRequest;
}): Promise<IPageIRedditPlatformGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sanitizedLimit = limit > 100 ? 100 : limit < 1 ? 1 : limit;
  const skip = (page - 1) * sanitizedLimit;
  const whereInput: Prisma.reddit_platform_guestsWhereInput = {
    deleted_at: null,
  };
  if (props.body.deviceFingerprint) {
    whereInput.email = { contains: props.body.deviceFingerprint };
  }
  if (props.body.sessionCreatedAtFrom || props.body.sessionCreatedAtTo) {
    whereInput.sessions = { some: {} };
    const sessionWhere: Prisma.reddit_platform_guest_sessionsWhereInput = {};
    const sessionConditions: Prisma.reddit_platform_guest_sessionsWhereInput[] =
      [];
    if (props.body.sessionCreatedAtFrom) {
      sessionConditions.push({
        created_at: { gte: props.body.sessionCreatedAtFrom },
      });
    }
    if (props.body.sessionCreatedAtTo) {
      sessionConditions.push({
        created_at: { lte: props.body.sessionCreatedAtTo },
      });
    }
    if (sessionConditions.length > 0) {
      (sessionWhere as any).created_at = { AND: sessionConditions };
    }
    (whereInput.sessions as any).some = sessionWhere;
  }
  if (props.body.lastActivityFrom || props.body.lastActivityTo) {
    whereInput.sessions = whereInput.sessions ?? { some: {} };
    const sessionWhere: Prisma.reddit_platform_guest_sessionsWhereInput =
      whereInput.sessions.some ?? {};
    const sessionConditions: Prisma.reddit_platform_guest_sessionsWhereInput[] =
      [];
    if (props.body.lastActivityFrom) {
      sessionConditions.push({
        created_at: { gte: props.body.lastActivityFrom },
      });
    }
    if (props.body.lastActivityTo) {
      sessionConditions.push({
        created_at: { lte: props.body.lastActivityTo },
      });
    }
    if (sessionConditions.length > 0) {
      (sessionWhere as any).created_at = { AND: sessionConditions };
    }
    (whereInput.sessions as any).some = sessionWhere;
  }
  const orderByInput = (
    props.body.sortBy === "lastActivity"
      ? {
          sessions: {
            _count: props.body.sortOrder === "asc" ? "asc" : ("desc" as const),
          },
        }
      : props.body.sortBy === "id"
        ? { id: props.body.sortOrder === "asc" ? "asc" : ("desc" as const) }
        : {
            created_at:
              props.body.sortOrder === "asc" ? "asc" : ("desc" as const),
          }
  ) satisfies Prisma.reddit_platform_guestsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_platform_guests.findMany({
    where: whereInput,
    skip,
    take: sanitizedLimit,
    orderBy: orderByInput,
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
      limit: sanitizedLimit,
      records: total,
      pages: Math.ceil(total / sanitizedLimit),
    } satisfies IPage.IPagination,
  };
}
