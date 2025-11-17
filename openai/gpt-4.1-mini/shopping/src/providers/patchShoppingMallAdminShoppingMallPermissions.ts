import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPermission";
import { IPageIShoppingMallPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPermission";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallPermissions(props: {
  admin: AdminPayload;
  body: IShoppingMallPermission.IRequest;
}): Promise<IPageIShoppingMallPermission.ISummary> {
  const { page, limit, search, sortBy, sortOrder } = props.body;

  const allowedSortBy = ["name", "label", "created_at"] as const;
  if (
    sortBy !== undefined &&
    !(allowedSortBy as readonly string[]).includes(sortBy)
  ) {
    throw new HttpException(`Invalid sortBy value: ${sortBy}`, 400);
  }

  const allowedSortOrder = ["asc", "desc"] as const;
  if (sortOrder !== undefined && !allowedSortOrder.includes(sortOrder)) {
    throw new HttpException(`Invalid sortOrder value: ${sortOrder}`, 400);
  }

  const rawPageNumber = (page > 0 ? page : 1) satisfies number as number;
  const pageNumber = rawPageNumber satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const rawPageLimit = (limit > 0 ? limit : 100) satisfies number as number;
  const pageLimit = rawPageLimit satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const skip = (pageNumber - 1) * pageLimit;

  const whereFilter = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { label: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const orderBy =
    sortBy !== undefined
      ? {
          [sortBy as (typeof allowedSortBy)[number]]: (sortOrder ?? "asc") as
            | "asc"
            | "desc",
        }
      : { created_at: "desc" as const };

  const [total, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_permissions.count({ where: whereFilter }),
    MyGlobal.prisma.shopping_mall_permissions.findMany({
      where: whereFilter,
      skip,
      take: pageLimit,
      orderBy,
    }),
  ]);

  return {
    pagination: {
      current: pageNumber,
      limit: pageLimit,
      records: total,
      pages: Math.ceil(total / pageLimit),
    },
    data: records.map((item) => ({
      id: item.id,
      name: item.name,
      label: item.label,
      description: item.description ?? null,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
