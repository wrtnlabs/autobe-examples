import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date());
  const deletedAt = now as string & tags.Format<"date-time">;

  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Verify variant exists and is owned by seller and not already deleted
    const variant = await prisma.shopping_mall_product_variants.findUnique({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });

    if (!variant) {
      throw new HttpException(
        "Product variant not found or not owned by seller",
        404,
      );
    }

    // Check for active cart items
    const cartItems = await prisma.shopping_mall_cart_items.findMany({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: "active",
        deleted_at: null,
      },
    });

    if (cartItems.length > 0) {
      throw new HttpException(
        "Cannot delete variant with active cart items",
        409,
      );
    }

    // Check for associated order items
    const orderItems = await prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_product_variant_id: props.variantId,
      },
    });

    if (orderItems.length > 0) {
      throw new HttpException(
        "Cannot delete variant with associated order items",
        409,
      );
    }

    // Check for active inventory reservations
    const inventoryUnits = await prisma.shopping_mall_inventory_units.findMany({
      where: { product_variant_id: props.variantId },
    });

    if (inventoryUnits.length > 0) {
      const reservationIds = inventoryUnits.map((unit) => unit.id);
      const reservations =
        await prisma.shopping_mall_inventory_reservations.findMany({
          where: { inventory_unit_id: { in: reservationIds } },
        });

      if (reservations.length > 0) {
        throw new HttpException(
          "Cannot delete variant with active inventory reservations",
          409,
        );
      }
    }

    // Create audit log entry
    await prisma.shopping_mall_data_change_logs.create({
      data: {
        actor_id: props.seller.id satisfies string as string,
        actor_type: "seller",
        entity_type: "product_variant",
        change_type: "delete",
        entity_id: props.variantId satisfies string as string,
        change_reason: "Seller deleted product variant",
        created_at: deletedAt satisfies string as string,
        id: v4(),
        updated_at: now,
      },
    });

    // Clean up inventory units and reservations
    await prisma.shopping_mall_inventory_reservations.deleteMany({
      where: {
        inventory_unit_id: { in: inventoryUnits.map((unit) => unit.id) },
      },
    });

    await prisma.shopping_mall_inventory_units.deleteMany({
      where: { product_variant_id: props.variantId },
    });

    // Hard delete the variant (as per spec: 'permanently delete')
    await prisma.shopping_mall_product_variants.delete({
      where: { id: props.variantId },
    });
  });
}
