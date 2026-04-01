import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingGuest";
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

export async function getErpHrmTimeTrackingGuestGuests(props: {
  guest: GuestPayload;
}): Promise<IPageIErpHrmTimeTrackingGuest.ISummary> {
  // Authorization is handled by the GuestAuth guard; this function remains read-only and safe.
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const [records, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_time_tracking_guests.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_guests.count({
      where: { deleted_at: null },
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      email: r.email,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
    })),
  } satisfies IPageIErpHrmTimeTrackingGuest.ISummary;
}
