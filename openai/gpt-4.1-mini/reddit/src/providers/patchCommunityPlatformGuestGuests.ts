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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestGuests(props: {
  guest: GuestPayload;
  body: ICommunityPlatformGuest.IRequest;
}): Promise<IPageICommunityPlatformGuest.ISummary> {
  // Default pagination parameters
  const page = 1;
  const limit = 100;
  const skip = 0;
  // Where condition only filtering deleted_at = null
  const whereInput = {
    deleted_at: null,
  } satisfies Prisma.community_platform_guestsWhereInput;
  // Fetch data from database
  const data = await MyGlobal.prisma.community_platform_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      device_fingerprint: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.community_platform_guests.count({
    where: whereInput,
  });
  // Return summary
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      deviceFingerprint: record.device_fingerprint,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
