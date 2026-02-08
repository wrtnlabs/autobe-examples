import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
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

export async function patchDiscussionBoardGuestGuests(props: {
  guest: GuestPayload;
  body: IDiscussionBoardGuest.IRequest;
}): Promise<IPageIDiscussionBoardGuest.ISummary> {
  // Since IRequest does not have page or limit properties, use defaults
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Construct filtering where clause with only valid IRequest properties
  // Remove deviceFingerprint, userAgent, ipAddress, anonymousId because they are not in IRequest
  const whereFilter = {
    deleted_at: null as null,
  };
  const dataRecords = await MyGlobal.prisma.discussion_board_guests.findMany({
    where: whereFilter,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      device_fingerprint: true,
      anonymous_id: true,
      user_agent: true,
      ip_address: true,
      created_at: true,
      updated_at: true,
    },
  });
  const totalCount = await MyGlobal.prisma.discussion_board_guests.count({
    where: whereFilter,
  });
  const data = dataRecords.map((record) => ({
    deviceFingerprint: record.device_fingerprint ?? null,
    anonymousId: record.anonymous_id ?? null,
    userAgent: record.user_agent ?? null,
    ipAddress: record.ip_address ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: totalCount > 0 ? Math.ceil(totalCount / limit) : 0,
    },
  };
}
