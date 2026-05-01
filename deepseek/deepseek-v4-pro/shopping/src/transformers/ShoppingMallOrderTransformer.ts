import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallOrderItemTransformer } from "./ShoppingMallOrderItemTransformer";
import { ShoppingMallShipmentTransformer } from "./ShoppingMallShipmentTransformer";

export namespace ShoppingMallOrderTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        recipient_name: true,
        phone_number: true,
        street_address: true,
        city: true,
        state_province: true,
        postal_code: true,
        country: true,
        total_price: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        orderItems: ShoppingMallOrderItemTransformer.select(),
        shipments: ShoppingMallShipmentTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallOrder> {
    return {
      id: input.id,
      code: input.code,
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      recipient_name: input.recipient_name,
      phone_number: input.phone_number,
      street_address: input.street_address,
      city: input.city,
      state_province: input.state_province,
      postal_code: input.postal_code,
      country: input.country,
      total_price: input.total_price,
      status: input.status,
      items: await ArrayUtil.asyncMap(
        input.orderItems,
        ShoppingMallOrderItemTransformer.transform,
      ),
      shipments: await ArrayUtil.asyncMap(
        input.shipments,
        ShoppingMallShipmentTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IShoppingMallOrder;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderTransformer {
//       export type Payload = Prisma.shopping_mall_ordersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             code: true,
//             recipient_name: true,
//             phone_number: true,
//             street_address: true,
//             city: true,
//             state_province: true,
//             postal_code: true,
//             country: true,
//             total_price: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: ShoppingMallCustomerAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.shopping_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrder> {
//         return {
//   id: {string},
//   code: {string},
//   customer: await ShoppingMallCustomerAtSummaryTransformer.transform(input.customer),
//   recipient_name: {string},
//   phone_number: {string},
//   street_address: {string},
//   city: {string},
//   state_province: {string},
//   postal_code: {string},
//   country: {string},
//   total_price: {number},
//   status: {string},
//   items: {Array<IShoppingMallOrderItem>},
//   shipments: {Array<IShoppingMallShipment>},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------