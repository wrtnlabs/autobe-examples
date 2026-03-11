import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShoppingCartAtSummaryTransformer } from "../transformers/EcommerceMallShoppingCartAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IEcommerceMallShoppingCart.IManage;
}): Promise<IEcommerceMallShoppingCart.ISummary> {
  const timestampNow = toISOStringSafe(new Date());
  const cart =
    await MyGlobal.prisma.ecommerce_mall_shopping_carts.findFirstOrThrow({
      where: {
        customer_id: props.customer.id,
      },
    });
  const operations = props.body.cartOperations ?? [];
  const syncVariantIds = props.body.syncVariantIds;
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const op of operations) {
      switch ((op as any).type) {
        case "add": {
          const variant =
            await tx.ecommerce_mall_product_variants.findFirstOrThrow({
              where: {
                id: (op as any).variant_id,
                is_active: true,
              },
              include: { product: true },
            });
          if (variant.stock_quantity <= 0) {
            throw new HttpException("Variant out of stock", 400);
          }
          const existingCartItem = await tx.ecommerce_mall_cart_items.findFirst(
            {
              where: {
                cart_id: cart.id,
                variant_id: (op as any).variant_id,
              },
            },
          );
          const priceSnapshot =
            variant.price_override ?? variant.product.base_price;
          if (existingCartItem) {
            await tx.ecommerce_mall_cart_items.update({
              where: {
                id: existingCartItem.id,
              },
              data: {
                quantity: existingCartItem.quantity + (op as any).quantity,
                updated_at: new Date(),
              },
            });
          } else {
            await tx.ecommerce_mall_cart_items.create({
              data: {
                id: v4(),
                cart_id: cart.id,
                variant_id: (op as any).variant_id,
                quantity: (op as any).quantity,
                price: priceSnapshot,
                created_at: new Date(),
                updated_at: new Date(),
              },
            });
          }
          await tx.ecommerce_mall_inventory_records.create({
            data: {
              id: v4(),
              variant_id: (op as any).variant_id,
              quantity_change: -(op as any).quantity,
              reason: "cart_reservation",
              timestamp: new Date(),
            },
          });
          await tx.ecommerce_mall_shopping_carts.update({
            where: { id: cart.id },
            data: { updated_at: new Date() },
          });
          break;
        }
        case "updateQuantity": {
          const cartItem = await tx.ecommerce_mall_cart_items.findFirstOrThrow({
            where: {
              id: (op as any).cart_item_id,
            },
          });
          if (cartItem.cart_id !== cart.id) {
            throw new HttpException("Cart item not found in cart", 404);
          }
          if ((op as any).quantity < 1) {
            throw new HttpException("Quantity must be at least 1", 400);
          }
          const variant =
            await tx.ecommerce_mall_product_variants.findUniqueOrThrow({
              where: { id: cartItem.variant_id },
            });
          if (variant.stock_quantity < (op as any).quantity) {
            throw new HttpException("Insufficient stock", 400);
          }
          await tx.ecommerce_mall_cart_items.update({
            where: { id: cartItem.id },
            data: {
              quantity: (op as any).quantity,
              updated_at: new Date(),
            },
          });
          await tx.ecommerce_mall_shopping_carts.update({
            where: { id: cart.id },
            data: { updated_at: new Date() },
          });
          break;
        }
        case "remove": {
          const cartItem = await tx.ecommerce_mall_cart_items.findFirstOrThrow({
            where: {
              cart_id: cart.id,
              variant_id: (op as any).variant_id,
            },
          });
          await tx.ecommerce_mall_inventory_records.create({
            data: {
              id: v4(),
              variant_id: (op as any).variant_id,
              quantity_change: cartItem.quantity,
              reason: "cart_release",
              timestamp: new Date(),
            },
          });
          await tx.ecommerce_mall_cart_items.update({
            where: { id: cartItem.id },
            data: {
              deleted_at: new Date(),
              updated_at: new Date(),
            },
          });
          await tx.ecommerce_mall_shopping_carts.update({
            where: { id: cart.id },
            data: { updated_at: new Date() },
          });
          break;
        }
        case "sync": {
          if (!syncVariantIds) {
            throw new HttpException(
              "syncVariantIds required for sync operation",
              400,
            );
          }
          const targetVariantIds = syncVariantIds.map((v) => v.id);
          const currentItems = await tx.ecommerce_mall_cart_items.findMany({
            where: {
              cart_id: cart.id,
            },
            include: { variant: true },
          });
          for (const targetVariant of syncVariantIds) {
            const existingItem = currentItems.find(
              (item) => item.variant_id === targetVariant.id,
            );
            if (existingItem) {
              await tx.ecommerce_mall_cart_items.update({
                where: { id: existingItem.id },
                data: {
                  quantity: (targetVariant as any).quantity,
                  updated_at: new Date(),
                },
              });
            } else {
              const variant =
                await tx.ecommerce_mall_product_variants.findUniqueOrThrow({
                  where: { id: targetVariant.id },
                  include: { product: true },
                });
              if (variant.stock_quantity < (targetVariant as any).quantity) {
                throw new HttpException("Insufficient stock", 400);
              }
              const priceSnapshot =
                variant.price_override ?? variant.product.base_price;
              await tx.ecommerce_mall_cart_items.create({
                data: {
                  id: v4(),
                  cart_id: cart.id,
                  variant_id: targetVariant.id,
                  quantity: (targetVariant as any).quantity,
                  price: priceSnapshot,
                  created_at: new Date(),
                  updated_at: new Date(),
                },
              });
              await tx.ecommerce_mall_inventory_records.create({
                data: {
                  id: v4(),
                  variant_id: targetVariant.id,
                  quantity_change: -(targetVariant as any).quantity,
                  reason: "cart_reservation",
                  timestamp: new Date(),
                },
              });
            }
          }
          for (const currentItem of currentItems) {
            if (!targetVariantIds.includes(currentItem.variant_id)) {
              await tx.ecommerce_mall_inventory_records.create({
                data: {
                  id: v4(),
                  variant_id: currentItem.variant_id,
                  quantity_change: currentItem.quantity,
                  reason: "cart_release",
                  timestamp: new Date(),
                },
              });
              await tx.ecommerce_mall_cart_items.update({
                where: { id: currentItem.id },
                data: { deleted_at: new Date(), updated_at: new Date() },
              });
            }
          }
          await tx.ecommerce_mall_shopping_carts.update({
            where: { id: cart.id },
            data: { updated_at: new Date() },
          });
          break;
        }
      }
    }
  });
  const cartData =
    await MyGlobal.prisma.ecommerce_mall_shopping_carts.findUniqueOrThrow({
      where: { id: cart.id },
      ...EcommerceMallShoppingCartAtSummaryTransformer.select(),
    });
  return await EcommerceMallShoppingCartAtSummaryTransformer.transform(
    cartData,
  );
}
