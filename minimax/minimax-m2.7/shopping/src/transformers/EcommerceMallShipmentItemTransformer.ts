import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallShipmentItemTransformer {
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
        order: true,
        product: true,
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            quantity: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            optionValues: {
              select: {
                id: true,
                key: true,
                value: true,
                created_at: true,
              },
            },
          },
        },
        productSnapshot: {
          select: {
            id: true,
            name: true,
            description: true,
            base_price: true,
            category_name: true,
            created_at: true,
            ecommerce_mall_product_id: true,
            seller: {
              select: {
                id: true,
                email: true,
                approval_status: true,
                created_at: true,
                rejected_at: true,
                rejection_reason: true,
              },
            },
          },
        },
        sellerProfileSnapshot: true,
        shipmentItem: {
          select: {
            id: true,
            created_at: true,
          },
        },
        cancellationRequests: true,
        refundRequests: true,
        reviews: true,
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipmentItem> {
    return {
      id: input.id,
      quantity: input.quantity,
      unitPrice: Number(input.unit_price),
      status: input.status,
      productSnapshot: {
        id: input.productSnapshot.id,
        name: input.productSnapshot.name,
        description: input.productSnapshot.description,
        basePrice: Number(input.productSnapshot.base_price),
        categoryName: input.productSnapshot.category_name,
        createdAt: toISOStringSafe(input.productSnapshot.created_at),
        productId: input.productSnapshot.ecommerce_mall_product_id,
        seller: {
          id: input.productSnapshot.seller.id,
          email: input.productSnapshot.seller.email,
          approvalStatus: input.productSnapshot.seller.approval_status,
          suspensionStatus: "",
          shopName: "",
          createdAt: toISOStringSafe(input.productSnapshot.seller.created_at),
          rejectedAt:
            input.productSnapshot.seller.rejected_at != null
              ? toISOStringSafe(input.productSnapshot.seller.rejected_at)
              : null,
          rejectionReason:
            input.productSnapshot.seller.rejection_reason ?? null,
        },
      },
      variantOptions: typia.assert<IEcommerceMallProductSnapshotVariant>({
        id: input.productVariant.id,
        sku_code: input.productVariant.sku_code,
        price: Number(input.productVariant.price),
        quantity: input.productVariant.quantity,
        created_at: toISOStringSafe(input.productVariant.created_at),
        updated_at: toISOStringSafe(input.productVariant.updated_at),
        deleted_at:
          input.productVariant.deleted_at != null
            ? toISOStringSafe(input.productVariant.deleted_at)
            : null,
        optionValues: input.productVariant.optionValues.map((ov) => ({
          id: ov.id,
          key: ov.key,
          value: ov.value,
          created_at: toISOStringSafe(ov.created_at),
        })),
      }),
      shipmentItemId: input.shipmentItem!.id,
      createdAt: toISOStringSafe(input.shipmentItem!.created_at),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShipmentItemTransformer {
//       export type Payload = Prisma.ecommerce_mall_order_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             unitPrice: true,
//             status: true,
//             shipmentItemId: true,
//             createdAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShipmentItem> {
//         return {
//   id: {string},
//   quantity: {integer},
//   unitPrice: {number},
//   status: {string},
//   productSnapshot: {IEcommerceMallProductSnapshot.ISummary},
//   variantOptions: {IEcommerceMallProductSnapshotVariant},
//   shipmentItemId: {string},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------