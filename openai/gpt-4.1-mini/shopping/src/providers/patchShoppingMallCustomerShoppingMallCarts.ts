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

export async function patchShoppingMallCustomerShoppingMallCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCart.IRequest;
}): Promise<IPageIShoppingMallCart.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build 'where' filter with conditional properties
  const where: {
    shopping_mall_customer_id: string & tags.Format<"uuid">;
    deleted_at?: (string & tags.Format<"date-time">) | null;
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    updated_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    shopping_mall_customer_id: props.customer.id,
  };

  if (props.body.deleted_at !== undefined) {
    where.deleted_at = props.body.deleted_at ?? null;
  }

  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    where.created_at = {};
    if (
      props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null
    ) {
      where.created_at.gte = props.body.created_at_from;
    }
    if (
      props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null
    ) {
      where.created_at.lte = props.body.created_at_to;
    }
  }

  if (
    props.body.updated_at_from !== undefined ||
    props.body.updated_at_to !== undefined
  ) {
    where.updated_at = {};
    if (
      props.body.updated_at_from !== undefined &&
      props.body.updated_at_from !== null
    ) {
      where.updated_at.gte = props.body.updated_at_from;
    }
    if (
      props.body.updated_at_to !== undefined &&
      props.body.updated_at_to !== null
    ) {
      where.updated_at.lte = props.body.updated_at_to;
    }
  }

  const [carts, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_carts.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        shopping_mall_customer_session_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_carts.count({ where }),
  ]);

  return {
    data: carts.map((cart) => ({
      id: cart.id,
      shopping_mall_customer_id: cart.shopping_mall_customer_id,
      shopping_mall_customer_session_id:
        cart.shopping_mall_customer_session_id ?? undefined,
      created_at: toISOStringSafe(cart.created_at),
      updated_at: toISOStringSafe(cart.updated_at),
      deleted_at: cart.deleted_at ? toISOStringSafe(cart.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
