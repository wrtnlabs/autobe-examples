import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    customer_id: props.customer.id,
    ...(props.body.availabilityStatus != null && {
      availability_status: props.body.availabilityStatus,
    }),
  } satisfies Prisma.shopping_mall_cart_itemsWhereInput;
  const items = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      quantity: true,
      availability_status: true,
      created_at: true,
      updated_at: true,
      productVariant: {
        select: {
          ...ShoppingMallProductVariantAtSummaryTransformer.select().select,
          product: {
            select: {
              base_price: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_cart_items.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(items, async (item) => {
    const variant =
      await ShoppingMallProductVariantAtSummaryTransformer.transform(
        item.productVariant,
      );
    const effective_price =
      item.productVariant.price_override ??
      item.productVariant.product.base_price;
    const subtotal = effective_price * item.quantity;
    return {
      id: item.id,
      variant,
      quantity: item.quantity,
      availability_status: item.availability_status,
      effective_price,
      subtotal,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
    } satisfies IShoppingMallCartItem.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
