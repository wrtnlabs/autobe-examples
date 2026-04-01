import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberProductVariantsProductVariantId(props: {
  member: MemberPayload;
  productVariantId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariant> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.productVariantId },
      select: {
        id: true,
        code: true,
        title: true,
        option_value: true,
        price: true,
        shopping_mall_product_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            is_featured: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            seller: { select: { id: true } },
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                slug: true,
                visibility: true,
                display_order: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                parent_category_id: true,
                parentCategory: { select: { id: true } },
                childCategories: { select: { id: true } },
                products: { select: { id: true } },
              },
            },
            reviews: { select: { id: true } },
          },
        },
        snapshots: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            code: true,
            price: true,
            name: true,
            currency: true,
            shopping_mall_product_variant_id: true,
            is_available: true,
            variant_status: true,
          },
        },
        inventoryRecords: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            shopping_mall_product_variant_id: true,
            stock_quantity: true,
            reserved_quantity: true,
            available_quantity: true,
          },
        },
        cartItems: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            shopping_mall_product_variant_id: true,
            quantity: true,
            shopping_mall_cart_id: true,
            subtotal_amount: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            placed_at: true,
            shopping_mall_order_id: true,
            seller_snapshot_id: true,
            shopping_mall_product_variant_id: true,
            shopping_mall_shipment_id: true,
            seller_price_at_purchase: true,
            quantity: true,
            line_item_status: true,
          },
        },
        // wishlistItems is intentionally omitted because it is not selectable in Prisma type for this model
      },
    });
  if (variant.is_active !== true || variant.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallProductVariantTransformer.transform(
    variant as unknown as Parameters<
      typeof ShoppingMallProductVariantTransformer.transform
    >[0],
  );
}
