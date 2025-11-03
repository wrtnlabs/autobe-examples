import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingStatusEnum";
import { IPageIShoppingStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingStatusEnum";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminStatusEnums(props: {
  admin: AdminPayload;
  body: IShoppingStatusEnum.IRequest;
}): Promise<IPageIShoppingStatusEnum.ISummary> {
  const {
    enum_domain,
    status_code,
    display_label,
    is_active,
    sort_by,
    sort_direction,
    page,
    limit,
  } = props.body;

  // Validate/normalize sort fields
  const allowedSorts = [
    "sort_order",
    "created_at",
    "updated_at",
    "display_label",
  ];
  const orderField = allowedSorts.includes(sort_by ?? "")
    ? sort_by!
    : "sort_order";
  const orderDir: "asc" | "desc" =
    sort_direction === "asc" || sort_direction === "desc"
      ? sort_direction
      : "desc";

  // Pagination
  const pageNum = page && page >= 1 ? page : 1;
  const pageLimit = limit && limit >= 1 && limit <= 100 ? limit : 20;
  const skipCount = (pageNum - 1) * pageLimit;

  // Build where clause
  const where = {
    deleted_at: null,
    ...(enum_domain !== undefined &&
      enum_domain !== null && { enum_domain: { contains: enum_domain } }),
    ...(status_code !== undefined &&
      status_code !== null && { status_code: { contains: status_code } }),
    ...(display_label !== undefined &&
      display_label !== null && { display_label: { contains: display_label } }),
    ...(is_active !== undefined && is_active !== null && { is_active }),
  };

  // Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_status_enums.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      skip: skipCount,
      take: pageLimit,
    }),
    MyGlobal.prisma.shopping_status_enums.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    enum_domain: row.enum_domain,
    status_code: row.status_code,
    display_label: row.display_label,
    sort_order: row.sort_order,
    is_active: row.is_active,
    description: row.description ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(pageLimit),
      records: total,
      pages: Math.ceil(total / pageLimit),
    },
    data,
  };
}
