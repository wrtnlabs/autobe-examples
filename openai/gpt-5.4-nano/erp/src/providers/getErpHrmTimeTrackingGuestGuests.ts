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
  // authorize guest context (guestAuthorize handled by decorator in runtime, but keep guard)
  void props.guest;
  // Defaults (must align with system-wide list expectations)
  const page: number = 1;
  const limit: number = 100;
  const skip: number = (page - 1) * limit;
  const [rows, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_time_tracking_guests.findMany({
      where: { deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_guests.count({
      where: { deleted_at: null },
    }),
  ]);
  return {
    pagination: {
      current: page as unknown as number,
      limit: limit as unknown as number,
      records: total as unknown as number,
      pages: Math.ceil(total / limit) as unknown as number,
    },
    data: rows.map((r) => ({
      id: r.id,
      email: r.email,
      created_at: r.created_at.toISOString() as unknown as string &
        tags.Format<"date-time">,
      updated_at: r.updated_at.toISOString() as unknown as string &
        tags.Format<"date-time">,
      deleted_at: null,
    })),
  };
}
