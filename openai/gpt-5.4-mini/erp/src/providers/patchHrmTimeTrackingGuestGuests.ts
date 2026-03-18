import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingGuest";
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

export async function patchHrmTimeTrackingGuestGuests(props: {
  guest: GuestPayload;
  body: IHrmTimeTrackingGuest.IRequest;
}): Promise<IPageIHrmTimeTrackingGuest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    ...(props.body.search !== undefined
      ? {
          id: props.body.search,
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: new globalThis.Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: new globalThis.Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.updatedAtFrom !== undefined ||
    props.body.updatedAtTo !== undefined
      ? {
          updated_at: {
            ...(props.body.updatedAtFrom !== undefined && {
              gte: new globalThis.Date(props.body.updatedAtFrom),
            }),
            ...(props.body.updatedAtTo !== undefined && {
              lte: new globalThis.Date(props.body.updatedAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.deleted === true
      ? { deleted_at: { not: null } }
      : props.body.deleted === false
        ? { deleted_at: null }
        : {}),
  } satisfies Prisma.hrm_time_tracking_guestsWhereInput;
  const orderBy = (
    props.body.sort === "createdAt"
      ? { created_at: "desc" }
      : props.body.sort === "updatedAt"
        ? { updated_at: "desc" }
        : { id: "asc" }
  ) satisfies Prisma.hrm_time_tracking_guestsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_time_tracking_guests.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const records = await MyGlobal.prisma.hrm_time_tracking_guests.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (row) =>
        ({
          id: row.id,
          created_at: toISOStringSafe(row.created_at),
          updated_at: toISOStringSafe(row.updated_at),
          deleted_at:
            row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
        }) satisfies IHrmTimeTrackingGuest.ISummary,
    ),
  };
}
