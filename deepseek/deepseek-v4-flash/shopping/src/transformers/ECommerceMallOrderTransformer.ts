import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallCustomerAtSummaryTransformer } from "./ECommerceMallCustomerAtSummaryTransformer";
import { ECommerceMallOrderItemTransformer } from "./ECommerceMallOrderItemTransformer";

export namespace ECommerceMallOrderTransformer {
  export type Payload = Prisma.e_commerce_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        total_price: true,
        shipping_recipient_name: true,
        shipping_phone: true,
        shipping_street_address: true,
        shipping_city: true,
        shipping_state_province: true,
        shipping_postal_code: true,
        shipping_country: true,
        created_at: true,
        updated_at: true,
        customer: ECommerceMallCustomerAtSummaryTransformer.select(),
        orderItems: ECommerceMallOrderItemTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallOrder> {
    return {
      id: input.id,
      code: input.code,
      totalPrice: input.total_price,
      shippingRecipientName: input.shipping_recipient_name,
      shippingPhone: input.shipping_phone,
      shippingStreetAddress: input.shipping_street_address,
      shippingCity: input.shipping_city,
      shippingStateProvince: input.shipping_state_province,
      shippingPostalCode: input.shipping_postal_code,
      shippingCountry: input.shipping_country,
      customer: await ECommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      orderItems: await ArrayUtil.asyncMap(
        input.orderItems,
        ECommerceMallOrderItemTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IECommerceMallOrder;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallOrderTransformer {
//       export type Payload = Prisma.e_commerce_mall_ordersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             code: true,
//             total_price: true,
//             shipping_recipient_name: true,
//             shipping_phone: true,
//             shipping_street_address: true,
//             shipping_city: true,
//             shipping_state_province: true,
//             shipping_postal_code: true,
//             shipping_country: true,
//             created_at: true,
//             updated_at: true,
//             customer: ECommerceMallCustomerAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.e_commerce_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallOrder> {
//         return {
//   id: {string},
//   code: {string},
//   totalPrice: {number},
//   shippingRecipientName: {string},
//   shippingPhone: {string},
//   shippingStreetAddress: {string},
//   shippingCity: {string},
//   shippingStateProvince: {string},
//   shippingPostalCode: {string},
//   shippingCountry: {string},
//   customer: await ECommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   orderItems: {Array<IECommerceMallOrderItem>},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------