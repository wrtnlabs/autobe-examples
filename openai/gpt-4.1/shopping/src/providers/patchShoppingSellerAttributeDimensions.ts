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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerAttributeDimensions(props: {
  seller: SellerPayload;
  body: IShoppingAttributeDimension.IRequest;
}): Promise<IPageIShoppingAttributeDimension.ISummary> {
  const body = props.body;
  // Defaults for paging
  const page = body.page ?? 1;
  const limit = Math.min(body.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  // Validate/normalize sort field
  const allowedSortFields = ["dimension_code", "name", "created_at"];
  const sort_by = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by
    : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // Build where clause, case-insensitive PARTIAL matching
  const where: Record<string, any> = {
    ...(body.dimension_code !== undefined &&
      body.dimension_code !== null && {
        dimension_code: {
          contains: body.dimension_code,
        },
      }),
    ...(body.name !== undefined &&
      body.name !== null && {
        name: {
          contains: body.name,
        },
      }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
  };

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.trim().length > 0
  ) {
    const searchTerm = body.search;
    where.OR = [
      { dimension_code: { contains: searchTerm } },
      { name: { contains: searchTerm } },
      { description: { contains: searchTerm } },
    ];
  }

  // Prepare orderBy object inline explicitly for each key (fixes TS2464)
  let orderBy: {
    dimension_code?: "asc" | "desc";
    name?: "asc" | "desc";
    created_at?: "asc" | "desc";
  };
  if (sort_by === "dimension_code") {
    orderBy = { dimension_code: sort_order };
  } else if (sort_by === "name") {
    orderBy = { name: sort_order };
  } else {
    orderBy = { created_at: sort_order };
  }

  // Query
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_attribute_dimensions.findMany({
      where,
      orderBy,
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
      pages: Math.ceil(total / limit),
    },
    data: records.map((row) => ({
      id: row.id,
      dimension_code: row.dimension_code,
      name: row.name,
      description: row.description ?? null,
    })),
  };
}
