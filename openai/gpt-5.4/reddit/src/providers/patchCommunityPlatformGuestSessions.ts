import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformGuestSessionAtSummaryTransformer } from "../transformers/CommunityPlatformGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestSessions(props: {
  body: ICommunityPlatformGuestSession.IRequest;
}): Promise<IPageICommunityPlatformGuestSession.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    ...(props.body.id !== undefined ? { id: props.body.id } : {}),
    ...(props.body.community_platform_guest_id !== undefined
      ? {
          community_platform_guest_id: props.body.community_platform_guest_id,
        }
      : {}),
    ...(props.body.guest_key !== undefined
      ? {
          guest: {
            guest_key: {
              contains: props.body.guest_key,
            },
          },
        }
      : {}),
    ...(props.body.ip !== undefined
      ? {
          ip: {
            contains: props.body.ip,
          },
        }
      : {}),
    ...(props.body.href !== undefined
      ? {
          href: {
            contains: props.body.href,
          },
        }
      : {}),
    ...(props.body.referrer !== undefined
      ? {
          referrer: {
            contains: props.body.referrer,
          },
        }
      : {}),
    ...(props.body.created_at !== undefined
      ? {
          created_at: props.body.created_at,
        }
      : {}),
    ...(props.body.expired_at !== undefined
      ? {
          expired_at: props.body.expired_at,
        }
      : {}),
  } satisfies Prisma.community_platform_guest_sessionsWhereInput;
  const orderBy: Prisma.community_platform_guest_sessionsOrderByWithRelationInput[] =
    props.body.sort === undefined
      ? [{ created_at: Prisma.SortOrder.desc }, { id: Prisma.SortOrder.desc }]
      : props.body.sort === "created_at_asc"
        ? [{ created_at: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }]
        : props.body.sort === "created_at_desc"
          ? [
              { created_at: Prisma.SortOrder.desc },
              { id: Prisma.SortOrder.desc },
            ]
          : props.body.sort === "expired_at_asc"
            ? [
                { expired_at: Prisma.SortOrder.asc },
                { id: Prisma.SortOrder.asc },
              ]
            : props.body.sort === "expired_at_desc"
              ? [
                  { expired_at: Prisma.SortOrder.desc },
                  { id: Prisma.SortOrder.desc },
                ]
              : props.body.sort === "id_asc"
                ? [{ id: Prisma.SortOrder.asc }]
                : props.body.sort === "id_desc"
                  ? [{ id: Prisma.SortOrder.desc }]
                  : (() => {
                      throw new HttpException("Invalid sort", 400);
                    })();
  const data = await MyGlobal.prisma.community_platform_guest_sessions.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy,
      ...CommunityPlatformGuestSessionAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.community_platform_guest_sessions.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformGuestSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
