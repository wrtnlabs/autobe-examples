import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAddressAtSummaryTransformer } from "./EcommerceMallCustomerAddressAtSummaryTransformer";
import { EcommerceMallMemberAtSummaryTransformer } from "./EcommerceMallMemberAtSummaryTransformer";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";

export namespace EcommerceMallOrderTransformer {
  export type Payload = Prisma.ecommerce_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        status: true,
        total_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: EcommerceMallMemberAtSummaryTransformer.select(),
        shippingAddress:
          EcommerceMallCustomerAddressAtSummaryTransformer.select(),
        customerReviews: true,
        snapshots: true,
        items: EcommerceMallOrderItemAtSummaryTransformer.select(),
        cancellationRequests: true,
      },
    } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrder> {
    return {
      id: input.id,
      order_number: input.order_number,
      status: input.status,
      total_price: Number(input.total_price),
      member: await EcommerceMallMemberAtSummaryTransformer.transform(
        input.member,
      ),
      shippingAddress:
        await EcommerceMallCustomerAddressAtSummaryTransformer.transform(
          input.shippingAddress,
        ),
      items: await ArrayUtil.asyncMap(
        input.items,
        EcommerceMallOrderItemAtSummaryTransformer.transform,
      ),
      shipments: [],
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
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
//             id: true,
//             order_number: true,
//             status: true,
//             total_price: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: EcommerceMallMemberAtSummaryTransformer.select(),
//             shippingAddress: EcommerceMallCustomerAddressAtSummaryTransformer.select(),
//             items: EcommerceMallOrderItemAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrder> {
//         return {
//   id: {string},
//   order_number: {string},
//   status: {string},
//   total_price: {number},
//   member: await EcommerceMallMemberAtSummaryTransformer.transform(input.member),
//   shippingAddress: await EcommerceMallCustomerAddressAtSummaryTransformer.transform(input.shippingAddress),
//   items: await ArrayUtil.asyncMap(input.items, EcommerceMallOrderItemAtSummaryTransformer.transform),
//   shipments: {Array<IEcommerceMallShipment.ISummary>},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------