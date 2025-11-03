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
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Compose created_at range condition
  const createdAtRange: {
    gte?: string & tags.Format<"date-time">;
    lte?: string & tags.Format<"date-time">;
  } = {};
  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    createdAtRange.gte = body.created_at_from;
  }
  if (body.created_at_to !== undefined && body.created_at_to !== null) {
    createdAtRange.lte = body.created_at_to;
  }

  // Compose updated_at range condition
  const updatedAtRange: {
    gte?: string & tags.Format<"date-time">;
    lte?: string & tags.Format<"date-time">;
  } = {};
  if (body.updated_at_from !== undefined && body.updated_at_from !== null) {
    updatedAtRange.gte = body.updated_at_from;
  }
  if (body.updated_at_to !== undefined && body.updated_at_to !== null) {
    updatedAtRange.lte = body.updated_at_to;
  }

  const whereCondition = {
    deleted_at: null,
    shopping_mall_customer_id: customer.id,
    ...(body.shopping_mall_customer_session_id !== undefined &&
      body.shopping_mall_customer_session_id !== null && {
        shopping_mall_customer_session_id:
          body.shopping_mall_customer_session_id,
      }),
    ...(Object.keys(createdAtRange).length > 0 && {
      created_at: createdAtRange,
    }),
    ...(Object.keys(updatedAtRange).length > 0 && {
      updated_at: updatedAtRange,
    }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shopping_carts.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_shopping_carts.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: results.map((r) => ({
      id: r.id,
      shopping_mall_customer_id: r.shopping_mall_customer_id,
      shopping_mall_customer_session_id: r.shopping_mall_customer_session_id,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    })),
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
