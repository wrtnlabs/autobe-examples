import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import { IPageIShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAttributeValue";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminAttributeDimensionsDimensionCodeValues(props: {
  admin: AdminPayload;
  dimensionCode: string;
  body: IShoppingAttributeValue.IRequest;
}): Promise<IPageIShoppingAttributeValue> {
  const { dimensionCode, body } = props;
  // 1. Lookup attribute dimension (by code, ensure not soft-deleted)
  const dimension =
    await MyGlobal.prisma.shopping_attribute_dimensions.findFirst({
      where: {
        dimension_code: dimensionCode,
      },
    });
  if (!dimension) {
    throw new HttpException("Attribute dimension not found", 404);
  }

  // 2. Extract search/filter/sort/pagination
  const search = body.search?.trim() ? body.search.trim() : undefined;
  const sortBy = body.sort_by || "display_order";
  const sortOrder = body.sort_order === "desc" ? "desc" : "asc";
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // 3. Build where clause
  const where = {
    shopping_attribute_dimension_id: dimension.id,
    deleted_at: null,
    ...(search && {
      OR: [
        { display_value: { contains: search } },
        { value_code: { contains: search } },
      ],
    }),
  };

  // 4. Build orderBy clause
  const orderBy = (() => {
    switch (sortBy) {
      case "display_order":
        return { display_order: sortOrder as Prisma.SortOrder };
      case "display_value":
        return { display_value: sortOrder as Prisma.SortOrder };
      case "value_code":
        return { value_code: sortOrder as Prisma.SortOrder };
      case "created_at":
        return { created_at: sortOrder as Prisma.SortOrder };
      default:
        return { display_order: "asc" as Prisma.SortOrder };
    }
  })();

  // 5. Query paginated data and count total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_attribute_values.findMany({
      where,
      orderBy,
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_attribute_values.count({ where }),
  ]);

  // 6. Map to DTO
  const data = rows.map((row) => ({
    id: row.id,
    shopping_attribute_dimension_id: row.shopping_attribute_dimension_id,
    value_code: row.value_code,
    display_value: row.display_value,
    display_order: row.display_order ?? null,
    // description: row.description ?? null, // removed: field does not exist
    created_at: toISOStringSafe(row.created_at),
  }));

  // 7. Compose pagination result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
