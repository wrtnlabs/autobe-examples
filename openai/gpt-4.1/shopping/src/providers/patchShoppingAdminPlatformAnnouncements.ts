import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPlatformAnnouncement";
import { IPageIShoppingPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingPlatformAnnouncement";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminPlatformAnnouncements(props: {
  admin: AdminPayload;
  body: IShoppingPlatformAnnouncement.IRequest;
}): Promise<IPageIShoppingPlatformAnnouncement.ISummary> {
  const { body } = props;
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Allowed sort fields
  const allowedSort: Record<string, true> = {
    created_at: true,
    publish_start_at: true,
    publish_end_at: true,
    title: true,
  };
  const sort_by =
    body.sort_by && allowedSort[body.sort_by] ? body.sort_by : "created_at";
  const order: "asc" | "desc" =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  const where = {
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.target_audience !== undefined && {
      target_audience: body.target_audience,
    }),
    ...(body.publish_start_after !== undefined &&
      body.publish_start_after !== null && {
        publish_start_at: { gte: body.publish_start_after },
      }),
    ...(body.publish_end_before !== undefined &&
      body.publish_end_before !== null && {
        publish_end_at: { lte: body.publish_end_before },
      }),
    // Search: match title OR body
    ...(body.search && body.search.length > 0
      ? {
          OR: [
            { title: { contains: body.search } },
            { body: { contains: body.search } },
          ],
        }
      : {}),
  };

  const [rows, records] = await Promise.all([
    MyGlobal.prisma.shopping_platform_announcements.findMany({
      where,
      orderBy: { [sort_by]: order },
      skip,
      take: limit,
      select: {
        id: true,
        admin_id: true,
        title: true,
        target_audience: true,
        status: true,
        publish_start_at: true,
        publish_end_at: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_platform_announcements.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: records,
      pages: Math.ceil(records / (limit === 0 ? 1 : limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      admin_id: row.admin_id,
      title: row.title,
      target_audience: row.target_audience,
      status: row.status,
      publish_start_at:
        row.publish_start_at === null || row.publish_start_at === undefined
          ? undefined
          : toISOStringSafe(row.publish_start_at),
      publish_end_at:
        row.publish_end_at === null || row.publish_end_at === undefined
          ? undefined
          : toISOStringSafe(row.publish_end_at),
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
