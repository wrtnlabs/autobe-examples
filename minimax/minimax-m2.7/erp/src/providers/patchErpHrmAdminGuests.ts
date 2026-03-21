import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminGuests(props: {
  admin: AdminPayload;
  body: IErpHrmGuest.IRequest;
}): Promise<IPageIErpHrmGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with soft-delete handling
  const whereInput = {
    ...(props.body.device_identifier !== undefined && {
      device_identifier: {
        contains: props.body.device_identifier,
      },
    }),
    ...(props.body.created_at_gte !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_gte),
      },
    }),
    ...(props.body.created_at_lte !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_lte),
      },
    }),
    ...(props.body.only_deleted === true
      ? { deleted_at: { not: null } }
      : props.body.only_deleted === false
        ? { deleted_at: null }
        : {}),
  } satisfies Prisma.erp_hrm_guestsWhereInput;
  // Query guests with session count aggregation
  const guests = await MyGlobal.prisma.erp_hrm_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      device_identifier: true,
      created_at: true,
      sessions: {
        where: {
          expired_at: { gt: new Date() },
        },
      },
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.erp_hrm_guests.count({
    where: whereInput,
  });
  // Transform results
  const data: IErpHrmGuest.ISummary[] = guests.map((guest) => ({
    id: guest.id as string & tags.Format<"uuid">,
    device_identifier: guest.device_identifier,
    created_at: toISOStringSafe(guest.created_at),
    sessions_count: guest.sessions.length as number & tags.Type<"int32">,
  }));
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIErpHrmGuest.ISummary;
}
