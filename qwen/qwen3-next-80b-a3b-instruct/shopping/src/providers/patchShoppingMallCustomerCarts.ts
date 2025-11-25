import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCart.IRequest;
}): Promise<IPageIShoppingMallCart.ISummary> {
  // Parse body as JSON string since it's declared as string type in DTO
  const bodyObj = JSON.parse(props.body) as Record<string, any>;

  // Parse pagination parameters from parsed object
  const page = Math.max(1, Number(bodyObj.page) || 1);
  const limit = Math.max(1, Math.min(1000, Number(bodyObj.limit) || 100));
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
  };

  // Filter by status if provided in body
  if (
    bodyObj.status &&
    ["active", "expired", "checked_out"].includes(bodyObj.status)
  ) {
    where.status = bodyObj.status;
  }

  // Always sort by created_at descending as default for consistency
  const orderBy = {
    created_at: "desc" satisfies "asc" | "desc" as "asc" | "desc",
  };

  // Query database
  const [carts, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_carts.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_carts.count({ where }),
  ]);

  // Map to array of cart IDs (string) matching IShoppingMallCart.ISummary = string
  const cartSummaries = carts.map((cart) => cart.id);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: cartSummaries,
  };
}
