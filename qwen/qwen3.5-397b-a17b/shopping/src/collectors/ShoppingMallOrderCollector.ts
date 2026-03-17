import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderCollector {
  export async function collect(props: {
    body: IShoppingMallOrder.ICreate;
    customer: IEntity;
  }) {
    const id: string = v4();
    // Query customer's cart to get items for order
    const cart = await MyGlobal.prisma.shopping_mall_carts.findFirstOrThrow({
      where: {
        shopping_customer_id: props.customer.id,
        deleted_at: null,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: true,
                  },
                },
                options: true,
              },
            },
          },
        },
      },
    });
    // Calculate total price from cart items (use base_price as fallback if variant.price is null)
    const totalPrice = cart.items.reduce((sum: number, item) => {
      const price = item.variant.price ?? item.variant.product.base_price;
      return sum + item.quantity * price;
    }, 0);
    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${v4().substring(0, 8)}`;
    // Create shipping address snapshot - using placeholder since addresses table doesn't exist
    // In real implementation, this would query the addresses table
    const shippingAddressSnapshot = JSON.stringify({
      recipient_name: "",
      phone_number: "",
      street_address: "",
      city: "",
      state_province: "",
      postal_code: "",
      country: "",
    });
    return {
      id,
      order_number: orderNumber,
      total_price: totalPrice,
      shipping_address_snapshot: shippingAddressSnapshot,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
      items: {
        create: await ArrayUtil.asyncMap(cart.items, async (cartItem) => {
          // Create product snapshot
          const productSnapshotId = v4();
          const productVariantSnapshotId = v4();
          return {
            id: v4(),
            quantity: cartItem.quantity,
            unit_price:
              cartItem.variant.price ?? cartItem.variant.product.base_price,
            status: "PAID",
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
            productVariant: { connect: { id: cartItem.variant.id } },
            seller: {
              connect: { id: cartItem.variant.product.shopping_seller_id },
            },
            productSnapshot: {
              create: {
                id: productSnapshotId,
                product: { connect: { id: cartItem.variant.product.id } },
                category: {
                  connect: {
                    id: cartItem.variant.product.shopping_category_id,
                  },
                },
                snapshotBy: {
                  connect: { id: cartItem.variant.product.shopping_seller_id },
                },
                name: cartItem.variant.product.name,
                description: cartItem.variant.product.description ?? "",
                base_price: cartItem.variant.product.base_price,
                snapshot_at: new Date(),
                created_at: new Date(),
                images: {
                  create: cartItem.variant.product.images.map((img) => ({
                    id: v4(),
                    image_url: img.image_url,
                    display_order: img.display_order,
                    created_at: new Date(),
                  })),
                },
              },
            },
            productVariantSnapshot: {
              create: {
                id: productVariantSnapshotId,
                productSnapshot: { connect: { id: productSnapshotId } },
                productVariant: { connect: { id: cartItem.variant.id } },
                sku_code: cartItem.variant.sku_code,
                option_values: JSON.stringify(
                  cartItem.variant.options.reduce(
                    (acc, opt) => ({ ...acc, [opt.key]: opt.value }),
                    {} as Record<string, string>,
                  ),
                ),
                price:
                  cartItem.variant.price ?? cartItem.variant.product.base_price,
                stock_quantity: cartItem.variant.stock_quantity,
                snapshot_at: new Date(),
              },
            },
          };
        }),
      },
      shipments: undefined,
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}
