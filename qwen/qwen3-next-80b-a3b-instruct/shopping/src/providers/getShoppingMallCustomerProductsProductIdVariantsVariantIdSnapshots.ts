import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductVariantSnapshotTransformer } from "../transformers/ShoppingMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerProductsProductIdVariantsVariantIdSnapshots(props: {
  customer: CustomerPayload;
  productId: string;
  variantId: string;
}): Promise<IPageIShoppingMallProductVariantSnapshot> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  // Authorization: Admins are handled by a different actor system — CustomerPayload.type is always 'customer'
  // Therefore, this function is called only for authorized customers
  // We need to check if the customer has purchased this exact variant
  const hasPurchased =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        order: {
          shopping_mall_customer_id: props.customer.id,
        },
      },
    });
  if (!hasPurchased) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshots =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where: { product_variant_id: props.variantId },
      skip,
      take: limit,
      orderBy: { version: "asc" },
      ...ShoppingMallProductVariantSnapshotTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where: { product_variant_id: props.variantId },
    });
  return {
    data: await ArrayUtil.asyncMap(
      snapshots,
      ShoppingMallProductVariantSnapshotTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
