import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { IPageIShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShoppingCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallShoppingCart.IRequest;
}): Promise<IPageIShoppingMallShoppingCart.ISummary> {
  const { customer, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  let sortField = "created_at";
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sort) {
    const parts = body.sort.trim().split(/\s+/);
    if (parts.length === 2) {
      const [field, order] = parts;
      if (
        field === "created_at" ||
        field === "updated_at" ||
        field === "session_id"
      ) {
        sortField = field;
      }
      if (order.toLowerCase() === "asc" || order.toLowerCase() === "desc") {
        sortOrder = order.toLowerCase() as "asc" | "desc";
      }
    }
  }

  const where: {
    deleted_at: null;
    shopping_mall_customer_id: string & tags.Format<"uuid">;
    session_id?: { contains: string };
    OR?: { session_id: { contains: string } }[];
  } = {
    deleted_at: null,
    shopping_mall_customer_id: customer.id,
    ...(body.session_id !== undefined &&
      body.session_id !== null && {
        session_id: { contains: body.session_id },
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        OR: [{ session_id: { contains: body.search } }],
      }),
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shopping_carts.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_shopping_carts.count({ where }),
  ]);

  const data = records.map((record) => ({
    id: record.id,
    shopping_mall_customer_id: record.shopping_mall_customer_id ?? null,
    session_id: record.session_id ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
