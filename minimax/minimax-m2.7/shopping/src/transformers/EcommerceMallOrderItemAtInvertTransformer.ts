import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";

export namespace EcommerceMallOrderItemAtInvertTransformer {
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
        productSnapshot: {
          select: {
            id: true,
            name: true,
            description: true,
            base_price: true,
            category_name: true,
          },
        } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs,
        sellerProfileSnapshot: {
          select: {
            id: true,
            shop_name: true,
            logo_url: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs,
        product: true,
        productVariant: true,
        shipmentItem: true,
        cancellationRequests: true,
        refundRequests: true,
        reviews: true,
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItem.IInvert> {
    return {
      id: input.id,
      quantity: input.quantity,
      unitPrice: input.unit_price,
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      productSnapshot: {
        id: input.productSnapshot.id,
        name: input.productSnapshot.name,
        description: input.productSnapshot.description,
        basePrice: input.productSnapshot.base_price,
        categoryName: input.productSnapshot.category_name,
      },
      sellerProfileSnapshot: {
        id: input.sellerProfileSnapshot.id,
        shopName: input.sellerProfileSnapshot.shop_name,
        logoUrl: input.sellerProfileSnapshot.logo_url ?? undefined,
      },
    } satisfies IEcommerceMallOrderItem.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderItemAtInvertTransformer {
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
//             ecommerce_mall_product_variant_id: true,
//             ecommerce_mall_product_snapshot_id: true,
//             ecommerce_mall_seller_profile_snapshot_id: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrderItem.IInvert> {
//         return {
//   id: {string},
//   quantity: {integer},
//   unitPrice: {number},
//   status: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   productSnapshot: {object},
//   sellerProfileSnapshot: {object},
//   order: await EcommerceMallOrderAtSummaryTransformer.transform(input.order),
//         };
//       }
//     }
//--------------------------------------------------------------