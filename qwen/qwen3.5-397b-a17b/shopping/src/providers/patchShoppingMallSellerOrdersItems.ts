import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerOrdersItems(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.shopping_mall_order_id !== undefined && {
      shopping_mall_order_id: props.body.shopping_mall_order_id,
    }),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const orderByInput = (
    props.body.sort === "price"
      ? { price: "desc" as const }
      : props.body.sort === "status"
        ? { status: "asc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      quantity: true,
      price: true,
      status: true,
      created_at: true,
      product: {
        select: {
          id: true,
          name: true,
        },
      },
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          price_override: true,
          created_at: true,
        },
      },
      seller: {
        select: {
          id: true,
          email: true,
          created_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
      product: {
        min: 0,
        max: 0,
      } satisfies IShoppingMallProduct.ISummary,
      productVariant: {
        id: item.productVariant.id,
        sku_code: item.productVariant.sku_code,
        price_override: item.productVariant.price_override,
        product: {
          min: 0,
          max: 0,
        } satisfies IShoppingMallProduct.ISummary,
        created_at: toISOStringSafe(item.productVariant.created_at),
      } satisfies IShoppingMallProductVariant.ISummary,
      seller: {
        id: item.seller.id,
        email: item.seller.email,
        created_at: toISOStringSafe(item.seller.created_at),
        approval_status: "pending",
      } satisfies IShoppingMallSeller.ISummary,
    })),
  };
}
