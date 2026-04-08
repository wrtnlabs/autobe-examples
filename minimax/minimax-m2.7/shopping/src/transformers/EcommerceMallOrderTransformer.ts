import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallShipmentAtSummaryTransformer } from "./EcommerceMallShipmentAtSummaryTransformer";
import { EcommerceMallShippingAddressAtSummaryTransformer } from "./EcommerceMallShippingAddressAtSummaryTransformer";

export namespace EcommerceMallOrderTransformer {
  export type Payload = Prisma.ecommerce_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        subtotal: true,
        shipping_cost: true,
        total_amount: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        shippingAddress:
          EcommerceMallShippingAddressAtSummaryTransformer.select(),
        orderItems: EcommerceMallOrderItemAtSummaryTransformer.select(),
        shipments: EcommerceMallShipmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrder> {
    return {
      id: input.id,
      order_number: input.order_number,
      subtotal: input.subtotal,
      shipping_cost: input.shipping_cost,
      total_amount: input.total_amount,
      status: input.status,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      shippingAddress:
        await EcommerceMallShippingAddressAtSummaryTransformer.transform(
          input.shippingAddress,
        ),
      orderItems: await ArrayUtil.asyncMap(
        input.orderItems,
        EcommerceMallOrderItemAtSummaryTransformer.transform,
      ),
      shipments: await ArrayUtil.asyncMap(
        input.shipments,
        EcommerceMallShipmentAtSummaryTransformer.transform,
      ),
      // Computed fields - no DB columns
      code: typia.assert<string>(""),
      message: typia.assert<string>(""),
      cartItemId: null,
      isValid: undefined,
      errors: undefined,
      warnings: undefined,
      items: undefined,
    } satisfies IEcommerceMallOrder;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderTransformer {
//       export type Payload = Prisma.ecommerce_mall_ordersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             code: true,
//             message: true,
//             cartItemId: true,
//             id: true,
//             order_number: true,
//             subtotal: true,
//             shipping_cost: true,
//             total_amount: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             isValid: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrder> {
//         return {
//   code: {string},
//   message: {string},
//   cartItemId: {string | null},
//   id: {string},
//   order_number: {string},
//   subtotal: {number},
//   shipping_cost: {number},
//   total_amount: {number},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   customer: {IEcommerceMallCustomer.ISummary},
//   shippingAddress: {IEcommerceMallShippingAddress.ISummary},
//   orderItems: {Array<IEcommerceMallOrderItem.ISummary>},
//   shipments: {Array<IEcommerceMallShipment.ISummary>},
//   isValid: {boolean},
//   errors: {Array<IEcommerceMallCheckout.IValidationError>},
//   warnings: {Array<IEcommerceMallOrder.IWarning>},
//   items: {Array<IEcommerceMallCart.IResult>},
//         };
//       }
//     }
//--------------------------------------------------------------