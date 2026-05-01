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
import { ShoppingMallCancellationRequestAtSummaryTransformer } from "./ShoppingMallCancellationRequestAtSummaryTransformer";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallOrderItemProductSnapshotTransformer } from "./ShoppingMallOrderItemProductSnapshotTransformer";
import { ShoppingMallOrderItemSellerSnapshotTransformer } from "./ShoppingMallOrderItemSellerSnapshotTransformer";
import { ShoppingMallOrderItemVariantSnapshotTransformer } from "./ShoppingMallOrderItemVariantSnapshotTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";
import { ShoppingMallRefundRequestAtSummaryTransformer } from "./ShoppingMallRefundRequestAtSummaryTransformer";
import { ShoppingMallShipmentAtSummaryTransformer } from "./ShoppingMallShipmentAtSummaryTransformer";

export namespace ShoppingMallOrderItemTransformer {
  export type Payload = Prisma.shopping_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        price: true,
        status: true,
        created_at: true,
        updated_at: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
        shipment: ShoppingMallShipmentAtSummaryTransformer.select(),
        productSnapshot:
          ShoppingMallOrderItemProductSnapshotTransformer.select(),
        variantSnapshot:
          ShoppingMallOrderItemVariantSnapshotTransformer.select(),
        sellerSnapshot: ShoppingMallOrderItemSellerSnapshotTransformer.select(),
        cancellationRequests:
          ShoppingMallCancellationRequestAtSummaryTransformer.select(),
        refundRequests: ShoppingMallRefundRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem> {
    return {
      id: input.id,
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      variant: await ShoppingMallProductVariantAtSummaryTransformer.transform(
        input.productVariant,
      ),
      shipment: input.shipment
        ? await ShoppingMallShipmentAtSummaryTransformer.transform(
            input.shipment,
          )
        : null,
      quantity: input.quantity,
      price: input.price,
      status: input.status,
      productSnapshot: input.productSnapshot
        ? await ShoppingMallOrderItemProductSnapshotTransformer.transform(
            input.productSnapshot,
          )
        : null,
      variantSnapshot: input.variantSnapshot
        ? await ShoppingMallOrderItemVariantSnapshotTransformer.transform(
            input.variantSnapshot,
          )
        : null,
      sellerSnapshot: input.sellerSnapshot
        ? await ShoppingMallOrderItemSellerSnapshotTransformer.transform(
            input.sellerSnapshot,
          )
        : null,
      cancellationRequests: await ArrayUtil.asyncMap(
        input.cancellationRequests,
        ShoppingMallCancellationRequestAtSummaryTransformer.transform,
      ),
      refundRequests: await ArrayUtil.asyncMap(
        input.refundRequests,
        ShoppingMallRefundRequestAtSummaryTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderItemTransformer {
//       export type Payload = Prisma.shopping_mall_order_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             price: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             order: ShoppingMallOrderAtSummaryTransformer.select(),
//             productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
//             shipment: ShoppingMallShipmentAtSummaryTransformer.select(),
//             sellerSnapshot: ShoppingMallOrderItemSellerSnapshotTransformer.select(),
//             variantSnapshot: ShoppingMallOrderItemVariantSnapshotTransformer.select(),
//             refundRequests: ShoppingMallRefundRequestAtSummaryTransformer.select(),
//             cancellationRequests: ShoppingMallCancellationRequestAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrderItem> {
//         return {
//   id: {string},
//   order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
//   variant: await ShoppingMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   shipment: input.shipment ? await ShoppingMallShipmentAtSummaryTransformer.transform(input.shipment) : null,
//   quantity: {integer},
//   price: {number},
//   status: {string},
//   productSnapshot: {IShoppingMallOrderItemProductSnapshot | null},
//   variantSnapshot: input.variantSnapshot ? await ShoppingMallOrderItemVariantSnapshotTransformer.transform(input.variantSnapshot) : null,
//   sellerSnapshot: input.sellerSnapshot ? await ShoppingMallOrderItemSellerSnapshotTransformer.transform(input.sellerSnapshot) : null,
//   cancellationRequests: await ArrayUtil.asyncMap(input.cancellationRequests, ShoppingMallCancellationRequestAtSummaryTransformer.transform),
//   refundRequests: await ArrayUtil.asyncMap(input.refundRequests, ShoppingMallRefundRequestAtSummaryTransformer.transform),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------