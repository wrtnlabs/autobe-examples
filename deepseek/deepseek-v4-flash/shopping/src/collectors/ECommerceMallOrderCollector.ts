import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ECommerceMallOrderCollector {
  export async function collect(props: {
    body: IECommerceMallOrder.ICreate;
    eCommerceMallCustomers: IEntity;
    eCommerceMallCustomerSessions: IEntity;
  }) {
    const id: string = v4();
    // 1. Fetch the shipping address for snapshot-copying
    // Must belong to the authenticated customer and not be soft-deleted
    const address =
      await MyGlobal.prisma.e_commerce_mall_customer_addresses.findFirstOrThrow(
        {
          where: {
            id: props.body.addressId,
            e_commerce_mall_customer_id: props.eCommerceMallCustomers.id,
            deleted_at: null,
          },
        },
      );
    // 2. Fetch all active (non-deleted) cart items for this customer
    // Include variant and its parent product for price resolution
    const cartItems = await MyGlobal.prisma.e_commerce_mall_cart_items.findMany(
      {
        where: {
          e_commerce_mall_customer_id: props.eCommerceMallCustomers.id,
          deleted_at: null,
        },
        include: {
          productVariant: {
            include: {
              product: {
                select: {
                  base_price: true,
                },
              },
            },
          },
        },
      },
    );
    // 3. Build order items data and calculate total price
    let totalPrice: number = 0;
    const orderItemsData = cartItems
      .filter((item) => item.productVariant.deleted_at === null)
      .map((item) => {
        // Resolve unit price: use variant price override, or fall back to product base_price
        const unitPrice: number =
          item.productVariant.price ?? item.productVariant.product.base_price;
        const subtotal: number = unitPrice * item.quantity;
        totalPrice += subtotal;
        return {
          id: v4(),
          quantity: item.quantity,
          unit_price: unitPrice,
          status: "paid",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
          productVariant: {
            connect: { id: item.e_commerce_mall_product_variant_id },
          },
        };
      });
    // 4. Generate unique order code
    const code: string = `ORD-${Date.now()}-${v4().slice(0, 8)}`;
    return {
      id,
      code,
      total_price: totalPrice,
      shipping_recipient_name: address.recipient_name,
      shipping_phone: address.phone_number,
      shipping_street_address: address.street_address,
      shipping_city: address.city,
      shipping_state_province: address.state_province,
      shipping_postal_code: address.postal_code,
      shipping_country: address.country,
      created_at: new Date(),
      updated_at: new Date(),
      customer: { connect: { id: props.eCommerceMallCustomers.id } },
      orderItems:
        orderItemsData.length > 0 ? { create: orderItemsData } : undefined,
      reviews: undefined,
    } satisfies Prisma.e_commerce_mall_ordersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ECommerceMallOrderCollector {
//         export async function collect(props: {
//           body: IECommerceMallOrder.ICreate;
//           eCommerceMallCustomers: IEntity; // from authorized actor
// eCommerceMallCustomerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       code: ...,
//       total_price: ...,
//       shipping_recipient_name: ...,
//       shipping_phone: ...,
//       shipping_street_address: ...,
//       shipping_city: ...,
//       shipping_state_province: ...,
//       shipping_postal_code: ...,
//       shipping_country: ...,
//       created_at: ...,
//       updated_at: ...,
//       customer: ...,
//       orderItems: ...,
//       reviews: ...,
//           } satisfies Prisma.e_commerce_mall_ordersCreateInput;
//         }
//       }
//--------------------------------------------------------------