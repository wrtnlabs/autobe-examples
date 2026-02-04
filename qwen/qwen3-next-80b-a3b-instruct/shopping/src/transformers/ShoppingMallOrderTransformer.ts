import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        total_price: true,
        payment_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
          },
        },
        shippingAddress: {
          select: {
            recipientName: true,
            streetAddress: true,
            city: true,
            stateProvince: true,
            postalCode: true,
            country: true,
            phoneNumber: true,
            isDefault: true,
          },
        },
        shopping_mall_order_snapshots: {
          select: {
            id: true,
            order_id: true,
            total_price: true,
            payment_status: true,
            shipping_address_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallOrder> {
    // Based on the IShoppingMallOrder type and the database schema, orderItems and shipments are not direct relations
    // but are constructed from joining with other tables (shopping_mall_order_items and shopping_mall_shipments).
    // Since we can only select data from the shopping_mall_orders table in this transformer,
    // and the transformer cannot perform joins or querying other tables, we must return empty arrays.
    // The service layer is responsible for aggregating the complete IShoppingMallOrder with orderItems and shipments.
    // This transformer transforms the base shopping_mall_orders record to its basic properties.
    const orderItemsJson = JSON.stringify([]);
    const shipmentsJson = JSON.stringify([]);
    // Parse shippingAddress from JSON field
    let shippingAddress: IShoppingMallCustomerAddress;
    if (input.shippingAddress) {
      try {
        const addressJson = JSON.parse(input.shippingAddress);
        shippingAddress = {
          recipientName: addressJson.recipientName,
          streetAddress: addressJson.streetAddress,
          city: addressJson.city,
          stateProvince: addressJson.stateProvince ?? undefined,
          postalCode: addressJson.postalCode,
          country: addressJson.country,
          phoneNumber: addressJson.phoneNumber ?? undefined,
          isDefault: addressJson.isDefault ?? undefined,
        };
      } catch (error) {
        // Fallback in case JSON parsing fails
        shippingAddress = {
          recipientName: "",
          streetAddress: "",
          city: "",
          postalCode: "",
          country: "",
          stateProvince: undefined,
          phoneNumber: undefined,
          isDefault: undefined,
        };
      }
    } else {
      // Fallback if shippingAddress is null
      shippingAddress = {
        recipientName: "",
        streetAddress: "",
        city: "",
        postalCode: "",
        country: "",
        stateProvince: undefined,
        phoneNumber: undefined,
        isDefault: undefined,
      };
    }
    return {
      customerId: input.customer.id as string & tags.Format<"uuid">,
      id: input.id,
      orderItems: orderItemsJson,
      shipments: shipmentsJson,
      shippingAddress: shippingAddress,
    };
  }
}
