import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "./EcommerceMallProductSnapshotAtSummaryTransformer";
import { EcommerceMallProductSnapshotVariantOptionValueTransformer } from "./EcommerceMallProductSnapshotVariantOptionValueTransformer";
import { EcommerceMallShipmentAtSummaryTransformer } from "./EcommerceMallShipmentAtSummaryTransformer";

export namespace EcommerceMallShipmentItemAtInvertTransformer {
  export type Payload = Prisma.ecommerce_mall_shipment_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        shipment: EcommerceMallShipmentAtSummaryTransformer.select(),
        orderItem: {
          select: {
            ...EcommerceMallOrderItemAtSummaryTransformer.select().select,
            productSnapshot: {
              select: {
                ...EcommerceMallProductSnapshotAtSummaryTransformer.select()
                  .select,
                productSnapshotVariants: {
                  select: {
                    id: true,
                    sku: true,
                    price_override: true,
                    optionValues:
                      EcommerceMallProductSnapshotVariantOptionValueTransformer.select(),
                  },
                } satisfies Prisma.ecommerce_mall_product_snapshot_variantsFindManyArgs,
              },
            },
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_shipment_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipmentItem.IInvert> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      productSnapshot:
        await EcommerceMallProductSnapshotAtSummaryTransformer.transform(
          input.orderItem.productSnapshot,
        ),
      productSnapshotVariant: {
        id: input.orderItem.productSnapshot.productSnapshotVariants[0].id,
        sku: input.orderItem.productSnapshot.productSnapshotVariants[0].sku,
        priceOverride:
          input.orderItem.productSnapshot.productSnapshotVariants[0]
            .price_override ?? null,
        optionValues: await ArrayUtil.asyncMap(
          input.orderItem.productSnapshot.productSnapshotVariants[0]
            .optionValues,
          EcommerceMallProductSnapshotVariantOptionValueTransformer.transform,
        ),
      },
      shipment: await EcommerceMallShipmentAtSummaryTransformer.transform(
        input.shipment,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShipmentItemAtInvertTransformer {
//       export type Payload = Prisma.ecommerce_mall_shipment_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             shipment: EcommerceMallShipmentAtSummaryTransformer.select(),
//             orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_shipment_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShipmentItem.IInvert> {
//         return {
//   id: {string},
//   createdAt: {string},
//   orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   productSnapshot: {IEcommerceMallProductSnapshot.ISummary},
//   productSnapshotVariant: {object},
//   shipment: await EcommerceMallShipmentAtSummaryTransformer.transform(input.shipment),
//         };
//       }
//     }
//--------------------------------------------------------------