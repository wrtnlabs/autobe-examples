import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductVariantOptionAtSummaryTransformer } from "./EcommerceMallProductVariantOptionAtSummaryTransformer";

export namespace EcommerceMallOrderItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        price_at_purchase: true,
        status: true,
        created_at: true,
        product: EcommerceMallProductAtSummaryTransformer.select(),
        variant: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            created_at: true,
            deleted_at: true,
            variantOptions:
              EcommerceMallProductVariantOptionAtSummaryTransformer.select(),
            inventoryRecords: {
              select: {
                quantity_change: true,
              },
            } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            profileSnapshots: {
              select: {
                shop_name: true,
              },
              orderBy: {
                created_at: "desc",
              },
              take: 1,
            } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItem.ISummary> {
    const currentStock = input.variant.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    const variantData: IEcommerceMallProductVariant.ISummary = {
      id: input.variant.id,
      skuCode: input.variant.sku_code,
      price: input.variant.price ?? null,
      options: await ArrayUtil.asyncMap(
        input.variant.variantOptions,
        EcommerceMallProductVariantOptionAtSummaryTransformer.transform,
      ),
      currentStock,
      isAvailable: currentStock > 0 && input.variant.deleted_at === null,
      createdAt: input.variant.created_at.toISOString(),
    };
    const profileSnapshot = input.seller.profileSnapshots[0];
    return {
      id: input.id,
      quantity: input.quantity,
      priceAtPurchase: input.price_at_purchase,
      status: input.status as
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded",
      createdAt: input.created_at.toISOString(),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      variant: variantData,
      seller: {
        id: input.seller.id,
        email: input.seller.email as string & tags.Format<"email">,
        shopName: profileSnapshot?.shop_name ?? "",
        approvalStatus: input.seller.approval_status,
        createdAt: input.seller.created_at.toISOString(),
        updatedAt: input.seller.updated_at.toISOString(),
        deletedAt: input.seller.deleted_at
          ? input.seller.deleted_at.toISOString()
          : null,
      } satisfies IEcommerceMallSeller.ISummary,
    };
  }
}
