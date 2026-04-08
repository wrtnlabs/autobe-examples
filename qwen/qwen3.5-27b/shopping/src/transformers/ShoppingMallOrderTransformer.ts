import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { ShoppingMallCustomerAddressAtSummaryTransformer } from "./ShoppingMallCustomerAddressAtSummaryTransformer";
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
        order_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        shippingAddress:
          ShoppingMallCustomerAddressAtSummaryTransformer.select(),
        items: ShoppingMallOrderItemTransformer.select(),
        shipments: ShoppingMallShipmentTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallOrder> {
    return {
      id: input.id,
      order_number: input.order_number,
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      shippingAddress:
        await ShoppingMallCustomerAddressAtSummaryTransformer.transform(
          input.shippingAddress,
        ),
      items: await ArrayUtil.asyncMap(
        input.items,
        ShoppingMallOrderItemTransformer.transform,
      ),
      shipments: await ArrayUtil.asyncMap(
        input.shipments,
        ShoppingMallShipmentTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
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
//             order_number: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: ShoppingMallCustomerAtSummaryTransformer.select(),
//             shippingAddress: ShoppingMallCustomerAddressAtSummaryTransformer.select(),
//             items: ShoppingMallOrderItemTransformer.select(),
//             shipments: ShoppingMallShipmentTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrder> {
//         return {
//   id: {string},
//   order_number: {string},
//   customer: await ShoppingMallCustomerAtSummaryTransformer.transform(input.customer),
//   shippingAddress: await ShoppingMallCustomerAddressAtSummaryTransformer.transform(input.shippingAddress),
//   items: await ArrayUtil.asyncMap(input.items, ShoppingMallOrderItemTransformer.transform),
//   shipments: await ArrayUtil.asyncMap(input.shipments, ShoppingMallShipmentTransformer.transform),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------