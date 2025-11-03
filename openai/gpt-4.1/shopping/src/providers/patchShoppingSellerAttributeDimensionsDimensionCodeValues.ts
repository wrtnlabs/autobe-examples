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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerAttributeDimensionsDimensionCodeValues(props: {
  seller: SellerPayload;
  dimensionCode: string;
  body: IShoppingAttributeValue.IRequest;
}): Promise<IPageIShoppingAttributeValue> {
  if (!props.seller || !props.seller.id) {
    throw new HttpException("Unauthorized: Seller is required.", 401);
  }

  const dimension =
    await MyGlobal.prisma.shopping_attribute_dimensions.findUnique({
      where: { dimension_code: props.dimensionCode },
      select: { id: true },
    });
  if (!dimension) {
    throw new HttpException(
      "Not Found: Attribute dimension does not exist.",
      404,
    );
  }

  const page =
    typeof props.body.page === "number" && props.body.page >= 1
      ? props.body.page
      : 1;
  const limit =
    typeof props.body.limit === "number" && props.body.limit >= 1
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    shopping_attribute_dimension_id: dimension.id,
  };
  if (props.body.search && props.body.search.length > 0) {
    where.OR = [
      { value_code: { contains: props.body.search } },
      { display_value: { contains: props.body.search } },
    ];
  }

  const allowedSort = [
    "display_order",
    "value_code",
    "display_value",
    "created_at",
  ];
  let orderBy;
  const sortBy = allowedSort.includes(props.body.sort_by || "")
    ? props.body.sort_by
    : undefined;
  const sortOrder =
    props.body.sort_order === "desc"
      ? Prisma.SortOrder.desc
      : Prisma.SortOrder.asc;
  if (sortBy) {
    orderBy = { [sortBy]: sortOrder };
  } else {
    orderBy = [
      { display_order: Prisma.SortOrder.asc },
      { created_at: Prisma.SortOrder.asc },
    ];
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_attribute_values.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_attribute_values.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_attribute_dimension_id: row.shopping_attribute_dimension_id,
    value_code: row.value_code,
    display_value: row.display_value,
    display_order:
      row.display_order === null || row.display_order === undefined
        ? null
        : row.display_order,
    description: "description" in row ? (row as any).description : null,
    created_at: toISOStringSafe(row.created_at),
  }));

  const pages = Math.ceil(total / limit);
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: pages,
  };

  return { pagination, data };
}
