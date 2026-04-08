import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
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
import { EcommerceMallShipmentItemTransformer } from "./EcommerceMallShipmentItemTransformer";

export namespace EcommerceMallShipmentAtInvertTransformer {
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
        shipmentItems: EcommerceMallShipmentItemTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipment.IInvert> {
    return {
      carrier: input.carrier,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      id: input.id,
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      shipmentItems: await ArrayUtil.asyncMap(
        input.shipmentItems,
        EcommerceMallShipmentItemTransformer.transform,
      ),
      tracking_number: input.tracking_number,
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceMallShipment.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShipmentAtInvertTransformer {
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
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShipment.IInvert> {
//         return {
//   carrier: {string},
//   created_at: {string},
//   deleted_at: {null | string},
//   id: {string},
//   order: await EcommerceMallOrderAtSummaryTransformer.transform(input.order),
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   shipmentItems: {Array<IEcommerceMallShipmentItem>},
//   tracking_number: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------