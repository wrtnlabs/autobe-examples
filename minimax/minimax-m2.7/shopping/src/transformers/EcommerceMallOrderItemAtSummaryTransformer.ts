import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "./EcommerceMallProductSnapshotAtSummaryTransformer";
import { EcommerceMallProductVariantTransformer } from "./EcommerceMallProductVariantTransformer";
import { EcommerceMallSellerProfileSnapshotAtSummaryTransformer } from "./EcommerceMallSellerProfileSnapshotAtSummaryTransformer";

export namespace EcommerceMallOrderItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        status: true,
        created_at: true,
        updated_at: true,
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        product: true,
        productVariant: EcommerceMallProductVariantTransformer.select(),
        productSnapshot:
          EcommerceMallProductSnapshotAtSummaryTransformer.select(),
        sellerProfileSnapshot:
          EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
        shipmentItem: { select: { id: true } },
        cancellationRequests: { select: { id: true } },
        refundRequests: { select: { id: true } },
        reviews: { select: { id: true } },
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      unit_price: input.unit_price,
      status: input.status,
      created_at: input.created_at.toISOString(),
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      productVariant: await EcommerceMallProductVariantTransformer.transform(
        input.productVariant,
      ),
      productSnapshot:
        await EcommerceMallProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      sellerProfileSnapshot:
        await EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform(
          input.sellerProfileSnapshot,
        ),
    } satisfies IEcommerceMallOrderItem.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderItemAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_order_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             unit_price: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             order: EcommerceMallOrderAtSummaryTransformer.select(),
//             ecommerce_mall_product_id: true,
//             productVariant: EcommerceMallProductVariantTransformer.select(),
//             productSnapshot: EcommerceMallProductSnapshotAtSummaryTransformer.select(),
//             sellerProfileSnapshot: EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrderItem.ISummary> {
//         return {
//   id: {string},
//   quantity: {integer},
//   unit_price: {number},
//   status: {string},
//   created_at: {string},
//   order: await EcommerceMallOrderAtSummaryTransformer.transform(input.order),
//   productVariant: await EcommerceMallProductVariantTransformer.transform(input.productVariant),
//   productSnapshot: await EcommerceMallProductSnapshotAtSummaryTransformer.transform(input.productSnapshot),
//   sellerProfileSnapshot: await EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform(input.sellerProfileSnapshot),
//         };
//       }
//     }
//--------------------------------------------------------------