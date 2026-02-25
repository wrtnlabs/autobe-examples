import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuests(props: {
  body: ICommunityPlatformGuest.IRequest;
}): Promise<IPageICommunityPlatformGuest.ISummary> {
  function toDateTimeString(date: Date | null): string | null {
    if (date === null) return null;
    return date.toISOString() as string &
      import("typia").tags.Format<"date-time">;
  }
  const page =
    props.body.page === undefined || props.body.page < 1 ? 1 : props.body.page;
  const limit =
    props.body.limit === undefined
      ? 20
      : props.body.limit < 1
        ? 1
        : props.body.limit > 100
          ? 100
          : props.body.limit;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.community_platform_guestsWhereInput = {
    deleted_at: null,
    ...(props.body.deviceFingerprint
      ? { device_fingerprint: props.body.deviceFingerprint }
      : {}),
    ...(props.body.createdAtFrom
      ? { created_at: { gte: props.body.createdAtFrom } }
      : {}),
    ...(props.body.createdAtTo
      ? { created_at: { lte: props.body.createdAtTo } }
      : {}),
  };
  const data = await MyGlobal.prisma.community_platform_guests.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.community_platform_guests.count({
    where: whereClause,
  });
  return {
    data: data.map((guest) => ({
      id: guest.id,
      deviceFingerprint: guest.device_fingerprint,
      createdAt: toDateTimeString(guest.created_at)!,
      updatedAt: toDateTimeString(guest.updated_at)!,
      deletedAt: toDateTimeString(guest.deleted_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
