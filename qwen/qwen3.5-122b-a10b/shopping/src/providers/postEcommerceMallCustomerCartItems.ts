import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.ICreate;
}): Promise<IEcommerceMallCartItem> {
  // Validate product variant exists and is not deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.body.product_variant_id,
        deleted_at: null,
      },
      include: {
        product: {
          select: {
            base_price: true,
          },
        },
        variantOptions: {
          select: {
            key: true,
            value: true,
          },
        },
      },
    });
  if (variant === null) {
    throw new HttpException("Product variant not found", 404);
  }
  // Validate stock quantity
  if (props.body.quantity > variant.stock_quantity) {
    throw new HttpException(
      `Insufficient stock. Available: ${variant.stock_quantity}`,
      400,
    );
  }
  const now = new Date();
  const cartItemId: string = v4();
  try {
    // Attempt to create new cart item
    const created = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
      data: {
        id: cartItemId,
        customer: {
          connect: {
            id: props.customer.id,
          },
        },
        productVariant: {
          connect: {
            id: props.body.product_variant_id,
          },
        },
        quantity: props.body.quantity,
        is_available: true,
        added_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    const unitPrice = variant.price ?? variant.product.base_price;
    const subtotal = created.quantity * unitPrice;
    return {
      items: [
        {
          id: created.id as string & tags.Format<"uuid">,
          quantity: created.quantity,
          is_available: created.is_available,
          added_at: toISOStringSafe(created.added_at) as string &
            tags.Format<"date-time">,
          product_variant: {
            id: variant.id as string & tags.Format<"uuid">,
            sku_code: variant.sku_code,
            price: variant.price ?? undefined,
            stock_quantity: variant.stock_quantity,
            option_values: Object.fromEntries(
              variant.variantOptions.map(
                (opt: { key: string; value: string }) => [opt.key, opt.value],
              ),
            ),
          } satisfies IEcommerceMallProductVariant.ISummary,
          subtotal: subtotal,
        } satisfies IEcommerceMallCartItem.ISummary,
      ],
      total: subtotal,
    } satisfies IEcommerceMallCartItem;
  } catch (error: any) {
    // Handle unique constraint violation - update existing cart item
    if (error.code === "P2002") {
      // Update quantity of existing cart item
      const updated = await MyGlobal.prisma.ecommerce_mall_cart_items.update({
        where: {
          customer_id_product_variant_id: {
            customer_id: props.customer.id,
            product_variant_id: props.body.product_variant_id,
          },
        },
        data: {
          quantity: props.body.quantity,
          updated_at: now,
        },
      });
      const unitPrice = variant.price ?? variant.product.base_price;
      const subtotal = updated.quantity * unitPrice;
      return {
        items: [
          {
            id: updated.id as string & tags.Format<"uuid">,
            quantity: updated.quantity,
            is_available: updated.is_available,
            added_at: toISOStringSafe(updated.added_at) as string &
              tags.Format<"date-time">,
            product_variant: {
              id: variant.id as string & tags.Format<"uuid">,
              sku_code: variant.sku_code,
              price: variant.price ?? undefined,
              stock_quantity: variant.stock_quantity,
              option_values: Object.fromEntries(
                variant.variantOptions.map(
                  (opt: { key: string; value: string }) => [opt.key, opt.value],
                ),
              ),
            } satisfies IEcommerceMallProductVariant.ISummary,
            subtotal: subtotal,
          } satisfies IEcommerceMallCartItem.ISummary,
        ],
        total: subtotal,
      } satisfies IEcommerceMallCartItem;
    }
    throw error;
  }
}
