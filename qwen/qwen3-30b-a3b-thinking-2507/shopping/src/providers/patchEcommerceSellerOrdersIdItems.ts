import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductVariantAtSummaryTransformer } from "../transformers/EcommerceProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerOrdersIdItems(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
  body: IEcommerceOrderItem.IRequest;
}): Promise<IPageIEcommerceOrderItem.ISummary> {
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.id, deleted_at: null },
  });
  const hasItemBelongsToSeller =
    await MyGlobal.prisma.ecommerce_order_items.findFirst({
      where: {
        order_id: props.id,
        variant: {
          product: {
            seller_id: props.seller.id,
          },
        },
      },
    });
  if (!hasItemBelongsToSeller) {
    throw new HttpException("Order not found for this seller", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_order_itemsWhereInput = {
    order_id: props.id,
    deleted_at: null,
    ...(props.body.filters &&
      Object.keys(props.body.filters).length > 0 && {
        AND: Object.entries(props.body.filters)
          .map(([key, value]) => {
            if (
              key === "status" &&
              typeof value === "string" &&
              [
                "paid",
                "shipped",
                "delivered",
                "cancelled",
                "refunded",
              ].includes(value)
            ) {
              return { status: value };
              return {};
            }
          })
          .filter(Boolean),
      }),
  };
  const items = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    select: {
      id: true,
      quantity: true,
      price: true,
      status: true,
      created_at: true,
      variant: EcommerceProductVariantAtSummaryTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.ecommerce_order_items.count({
    where: whereInput,
  });
  const transformedItems = await Promise.all(
    items
      .filter((item) => item.variant !== null)
      .map(async (item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        status: item.status as
          | "paid"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded",
        created_at: toISOStringSafe(item.created_at),
        variant: (await EcommerceProductVariantAtSummaryTransformer.transform(
          item.variant,
        )) satisfies IEcommerceProductVariant.ISummary,
      })),
  );
  return {
    data: transformedItems,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
