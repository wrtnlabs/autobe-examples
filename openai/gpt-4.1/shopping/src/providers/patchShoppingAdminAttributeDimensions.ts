import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import { IPageIShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAttributeDimension";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminAttributeDimensions(props: {
  admin: AdminPayload;
  body: IShoppingAttributeDimension.IRequest;
}): Promise<IPageIShoppingAttributeDimension.ISummary> {
  const body = props.body;
  // Defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Where condition: always exclude deleted_at != null
  const where = {
    deleted_at: null,
    ...(body.dimension_code ? { dimension_code: body.dimension_code } : {}),
    ...(body.name ? { name: { contains: body.name } } : {}),
    // created_from and created_to as date range
    ...((body.created_from || body.created_to) && {
      created_at: {
        ...(body.created_from ? { gte: body.created_from } : {}),
        ...(body.created_to ? { lte: body.created_to } : {}),
      },
    }),
    // Full-text search (on dimension_code, name, description): OR partial match if search present
    ...(body.search && {
      OR: [
        { dimension_code: { contains: body.search } },
        { name: { contains: body.search } },
        { description: { contains: body.search } },
      ],
    }),
  };

  // Sort
  const allowedSort = ["dimension_code", "name", "created_at"];
  const sort_by =
    body.sort_by && allowedSort.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_attribute_dimensions.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: limit,
      select: {
        id: true,
        dimension_code: true,
        name: true,
        description: true,
      },
    }),
    MyGlobal.prisma.shopping_attribute_dimensions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      dimension_code: row.dimension_code,
      name: row.name,
      description: row.description ?? null,
    })),
  };
}
