import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
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
        ecommerce_mall_product_variant_id: true,
        order: {
          select: {
            id: true,
            order_number: true,
            status: true,
            subtotal: true,
            shipping_cost: true,
            total_amount: true,
            created_at: true,
            deleted_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                profile: {
                  select: {
                    id: true,
                    display_name: true,
                    phone: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
              },
            },
            orderItems: {
              select: { id: true },
            } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
            shipments: {
              select: { id: true },
            } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_ordersFindManyArgs,
        product: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
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
                updated_at: true,
                rejected_at: true,
                rejection_reason: true,
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs,
        sellerProfileSnapshot: {
          select: {
            id: true,
            shop_name: true,
            shop_description: true,
            logo_url: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs,
        shipmentItem: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_shipment_itemsFindManyArgs,
        cancellationRequests: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs,
        refundRequests: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs,
        reviews: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItem.IInvert> {
    const customerStatus =
      input.order.customer.deleted_at === null ? "active" : "banned";
    const profile = input.order.customer.profile;
    if (!input.productVariant) {
      throw new HttpException("Product variant not found", 404);
    }
    return {
      id: input.id,
      quantity: input.quantity,
      unitPrice: Number(input.unit_price),
      lineTotal: input.quantity * Number(input.unit_price),
      status: input.status,
      createdAt: toISOStringSafe(input.created_at),
      order: {
        id: input.order.id,
        order_number: input.order.order_number,
        status: input.order.status,
        subtotal: Number(input.order.subtotal),
        shipping_cost: Number(input.order.shipping_cost),
        total_amount: Number(input.order.total_amount),
        created_at: toISOStringSafe(input.order.created_at),
        deleted_at:
          input.order.deleted_at != null
            ? toISOStringSafe(input.order.deleted_at)
            : null,
        customer: {
          id: input.order.customer.id,
          email: input.order.customer.email,
          created_at: toISOStringSafe(input.order.customer.created_at),
          updated_at: toISOStringSafe(input.order.customer.updated_at),
          deleted_at:
            input.order.customer.deleted_at != null
              ? toISOStringSafe(input.order.customer.deleted_at)
              : null,
          status: customerStatus as "active" | "banned",
          profile: {
            id: profile!.id,
            display_name: profile!.display_name,
            phone: profile!.phone,
            created_at: toISOStringSafe(profile!.created_at),
            updated_at: toISOStringSafe(profile!.updated_at),
          },
        },
        items_count: input.order.orderItems?.length ?? 0,
        shipments_count: input.order.shipments?.length ?? 0,
      } satisfies IEcommerceMallOrder.ISummary,
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
          email: input.productSnapshot.seller.email as string & {
            format: "email";
          },
          approvalStatus: input.productSnapshot.seller.approval_status,
          createdAt: toISOStringSafe(input.productSnapshot.seller.created_at),
          rejectedAt:
            input.productSnapshot.seller.rejected_at != null
              ? toISOStringSafe(input.productSnapshot.seller.rejected_at)
              : null,
          rejectionReason:
            input.productSnapshot.seller.rejection_reason ?? null,
          shopName: null,
          suspensionStatus: "active",
        },
      } satisfies IEcommerceMallProductSnapshot.ISummary,
      sellerProfileSnapshot: {
        id: input.sellerProfileSnapshot.id,
        shopName: input.sellerProfileSnapshot.shop_name,
        shopDescription: input.sellerProfileSnapshot.shop_description,
        logoUrl: input.sellerProfileSnapshot.logo_url,
        createdAt: toISOStringSafe(input.sellerProfileSnapshot.created_at),
      } satisfies IEcommerceMallSellerProfileSnapshot.ISummary,
      variant: {
        id: input.productVariant.id,
        key: input.productVariant.sku_code ?? "",
        value: "",
        created_at: toISOStringSafe(input.productVariant.created_at),
      } satisfies IEcommerceMallProductSnapshotVariant,
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
//             ecommerce_mall_order_id: true,
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
//   lineTotal: {number},
//   status: {string},
//   createdAt: {string},
//   order: {IEcommerceMallOrder.ISummary},
//   productSnapshot: {IEcommerceMallProductSnapshot.ISummary},
//   sellerProfileSnapshot: {IEcommerceMallSellerProfileSnapshot.ISummary},
//   variant: {IEcommerceMallProductSnapshotVariant},
//         };
//       }
//     }
//--------------------------------------------------------------