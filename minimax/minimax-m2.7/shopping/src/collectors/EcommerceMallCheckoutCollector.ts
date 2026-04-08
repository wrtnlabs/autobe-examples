import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallCheckoutCollector {
  export async function collect(props: {
    body: IEcommerceMallCheckout.ICreate;
    ecommerceMallCustomers: IEntity;
    ecommerceMallCustomerSessions: IEntity;
  }) {
    // Query customer's cart with items and variant details
    const cart = await MyGlobal.prisma.ecommerce_mall_carts.findFirstOrThrow({
      where: { ecommerce_mall_customer_id: props.ecommerceMallCustomers.id },
      include: {
        cartItems: {
          include: {
            productVariant: {
              include: {
                product: {
                  include: {
                    seller: true,
                    category: true,
                  },
                },
                optionValues: true,
              },
            },
          },
        },
      },
    });
    // Calculate order totals from cart items
    let subtotal = 0;
    for (const item of cart.cartItems) {
      subtotal += (item.productVariant.price ?? 0) * item.quantity;
    }
    const shippingCost = 0;
    const totalAmount = subtotal + shippingCost;
    // Resolve shipping address
    let shippingAddressId: string;
    if (props.body.shippingAddressId) {
      shippingAddressId = props.body.shippingAddressId;
    } else {
      const defaultAddress =
        await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirstOrThrow(
          {
            where: {
              ecommerce_mall_customer_id: props.ecommerceMallCustomers.id,
              is_default: true,
              deleted_at: null,
            },
          },
        );
      shippingAddressId = defaultAddress.id;
    }
    // Generate unique order number
    const timestamp = Date.now();
    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    const orderNumber = `ORD-${timestamp}-${randomSuffix}`;
    // Create order items with inline product snapshots
    const orderItems = await ArrayUtil.asyncMap(
      cart.cartItems,
      async (cartItem) => {
        const product = cartItem.productVariant.product;
        const variant = cartItem.productVariant;
        const sellerSnapshotId = v4();
        const productSnapshotId = v4();
        const snapshotCreatedAt = new Date();
        const variantSnapshotId = v4();
        const optionValueSnapshots = (variant.optionValues ?? []).map(
          (opt) => ({
            id: v4(),
            option_name: opt.key,
            option_value: opt.value,
            product_snapshot_variant_id: variantSnapshotId,
          }),
        );
        return {
          id: v4(),
          quantity: cartItem.quantity,
          unit_price: variant.price ?? 0,
          total_price: (variant.price ?? 0) * cartItem.quantity,
          status: "pending",
          created_at: snapshotCreatedAt,
          updated_at: snapshotCreatedAt,
          product: { connect: { id: product.id } },
          productVariant: { connect: { id: variant.id } },
          variant: { connect: { id: variant.id } },
          productSnapshot: {
            create: {
              id: productSnapshotId,
              ecommerce_mall_product_id: product.id,
              name: product.name,
              description: product.description,
              created_at: snapshotCreatedAt,
              ecommerce_mall_seller_id: product.ecommerce_mall_seller_id,
              base_price: product.base_price,
              category_name: product.category?.name ?? "Uncategorized",
              variants: {
                create: {
                  id: variantSnapshotId,
                  sku: variant.sku_code ?? "",
                  price: variant.price ?? 0,
                  optionValues: {
                    create: optionValueSnapshots,
                  },
                },
              },
            },
          },
          sellerProfileSnapshot: {
            create: {
              id: sellerSnapshotId,
              seller_name: product.seller?.email ?? "Unknown",
              seller_email: product.seller?.email ?? "",
              created_at: snapshotCreatedAt,
              shop_name: product.seller?.email ?? "Unknown Shop",
              sellerProfile: {
                connect: { id: product.ecommerce_mall_seller_id },
              },
            },
          },
        } as Prisma.ecommerce_mall_order_itemsCreateWithoutOrderInput;
      },
    );
    return {
      id: v4(),
      order_number: orderNumber,
      subtotal: subtotal,
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      status: "paid",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      shippingAddress: { connect: { id: shippingAddressId } },
      orderItems: {
        create: orderItems,
      },
    } satisfies Prisma.ecommerce_mall_ordersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallCheckoutCollector {
//         export async function collect(props: {
//           body: IEcommerceMallCheckout.ICreate;
//           ecommerceMallCustomers: IEntity; // from authorized actor
// ecommerceMallCustomerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       order_number: ...,
//       subtotal: ...,
//       shipping_cost: ...,
//       total_amount: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       shippingAddress: ...,
//       orderItems: ...,
//       shipments: ...,
//           } satisfies Prisma.ecommerce_mall_ordersCreateInput;
//         }
//       }
//--------------------------------------------------------------