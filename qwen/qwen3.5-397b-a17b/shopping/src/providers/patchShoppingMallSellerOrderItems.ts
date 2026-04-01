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

export async function patchShoppingMallSellerOrderItems(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.shopping_mall_order_id && {
      shopping_mall_order_id: props.body.shopping_mall_order_id,
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
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
          base_price: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          price_override: true,
          created_at: true,
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
            },
          },
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
    data: data.map((item) => {
      return {
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        status: item.status,
        product: {
          id: item.product.id,
          name: item.product.name,
          base_price: item.product.base_price,
          min: item.product.base_price,
          max: item.product.base_price,
          category: {
            id: item.product.category.id,
            name: item.product.category.name,
          },
        },
        productVariant: {
          id: item.productVariant.id,
          sku_code: item.productVariant.sku_code,
          price_override: item.productVariant.price_override,
          created_at: toISOStringSafe(item.productVariant.created_at),
          product: {
            id: item.productVariant.product.id,
            name: item.productVariant.product.name,
            base_price: item.productVariant.product.base_price,
            min: item.productVariant.product.base_price,
            max: item.productVariant.product.base_price,
          },
        },
        seller: {
          id: item.seller.id,
          email: item.seller.email,
          created_at: toISOStringSafe(item.seller.created_at),
          approval_status: "pending" as const,
        },
        created_at: toISOStringSafe(item.created_at),
      };
    }),
  };
}
