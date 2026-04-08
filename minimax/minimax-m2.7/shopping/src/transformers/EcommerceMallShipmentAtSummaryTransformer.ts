import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallShipmentAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        carrier: true,
        tracking_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        shipmentItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_shipment_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipment.ISummary> {
    return {
      id: input.id,
      carrier: input.carrier,
      tracking_number: input.tracking_number,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      item_count: input.shipmentItems.length,
    } satisfies IEcommerceMallShipment.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShipmentAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             carrier: true,
//             tracking_number: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             order: EcommerceMallOrderAtSummaryTransformer.select(),
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShipment.ISummary> {
//         return {
//   id: {string},
//   carrier: {string},
//   tracking_number: {string},
//   created_at: {string},
//   updated_at: {string},
//   order: await EcommerceMallOrderAtSummaryTransformer.transform(input.order),
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   item_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------