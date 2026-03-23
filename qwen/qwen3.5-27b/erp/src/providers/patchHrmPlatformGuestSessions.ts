import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmPlatformGuestSessionAtSummaryTransformer } from "../transformers/HrmPlatformGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformGuestSessions(props: {
  guest: GuestPayload;
  body: IHrmPlatformGuestSession.IRequest;
}): Promise<IPageIHrmPlatformGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_guest_sessionsWhereInput = {};
  // Status filter: active = expired_at IS NULL, expired = expired_at IS NOT NULL
  if (props.body.status !== undefined) {
    if (props.body.status === "active") {
      whereInput.expired_at = {
        equals: null,
      } as any;
    } else if (props.body.status === "expired") {
      whereInput.expired_at = {
        not: {
          equals: null,
        },
      } as any;
    }
  }
  // Date range filter on created_at
  if (props.body.created_at_start !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_start),
    };
  }
  if (props.body.created_at_end !== undefined) {
    if (whereInput.created_at === undefined) {
      whereInput.created_at = {
        lte: new Date(props.body.created_at_end),
      };
    } else {
      whereInput.created_at = {
        ...(whereInput.created_at as object),
        lte: new Date(props.body.created_at_end),
      };
    }
  }
  // IP address exact match
  if (props.body.ip !== undefined) {
    whereInput.ip = props.body.ip;
  }
  // Text search across ip, href, referrer
  if (props.body.search !== undefined) {
    whereInput.OR = [
      { ip: { contains: props.body.search } },
      { href: { contains: props.body.search } },
      { referrer: { contains: props.body.search } },
    ];
  }
  const data = await MyGlobal.prisma.hrm_platform_guest_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmPlatformGuestSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_guest_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformGuestSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
