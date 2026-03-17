import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallShipmentItemTransformer } from "./EcommerceMallShipmentItemTransformer";

export namespace EcommerceMallShipmentTransformer {
  export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        carrier_name: true,
        tracking_number: true,
        shipped_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            profile: {
              where: { deleted_at: null },
              orderBy: { created_at: "desc" },
              take: 1,
              select: {
                shop_name: true,
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        order: {
          select: {
            id: true,
            order_number: true,
            total_price: true,
            status: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_ordersFindManyArgs,
        shipmentItems: EcommerceMallShipmentItemTransformer.select(),
        delivery: {
          select: {
            id: true,
            delivered_at: true,
            is_auto_delivered: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            customer: EcommerceMallCustomerAtSummaryTransformer.select(),
          },
        } satisfies Prisma.ecommerce_mall_shipment_deliveriesFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipment> {
    const sellerProfile = input.seller.profile[0];
    return {
      id: input.id,
      carrierName: input.carrier_name,
      trackingNumber: input.tracking_number,
      shippedAt: toISOStringSafe(input.shipped_at),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      seller: {
        id: input.seller.id,
        email: input.seller.email as string & tags.Format<"email">,
        shopName: sellerProfile?.shop_name ?? "",
        approvalStatus: input.seller.approval_status,
        createdAt: toISOStringSafe(input.seller.created_at),
        updatedAt: toISOStringSafe(input.seller.updated_at),
        deletedAt: input.seller.deleted_at
          ? toISOStringSafe(input.seller.deleted_at)
          : null,
      } satisfies IEcommerceMallSeller.ISummary,
      order: {
        id: input.order.id,
        orderNumber: input.order.order_number,
        totalPrice: input.order.total_price,
        status: input.order.status,
        createdAt: toISOStringSafe(input.order.created_at),
      } satisfies IEcommerceMallOrder.ISummary,
      shipmentItems: await ArrayUtil.asyncMap(
        input.shipmentItems,
        EcommerceMallShipmentItemTransformer.transform,
      ),
      delivery: input.delivery
        ? {
            id: input.delivery.id,
            shipment: {
              id: input.id,
              sellerId: input.seller_id,
              orderId: input.order_id,
              carrierName: input.carrier_name,
              trackingNumber: input.tracking_number,
              shippedAt: toISOStringSafe(input.shipped_at),
              seller: {
                id: input.seller.id,
                email: input.seller.email as string & tags.Format<"email">,
                shopName: sellerProfile?.shop_name ?? "",
                approvalStatus: input.seller.approval_status,
                createdAt: toISOStringSafe(input.seller.created_at),
                updatedAt: toISOStringSafe(input.seller.updated_at),
                deletedAt: input.seller.deleted_at
                  ? toISOStringSafe(input.seller.deleted_at)
                  : null,
              } satisfies IEcommerceMallSeller.ISummary,
              order: {
                id: input.order.id,
                orderNumber: input.order.order_number,
                totalPrice: input.order.total_price,
                status: input.order.status,
                createdAt: toISOStringSafe(input.order.created_at),
              } satisfies IEcommerceMallOrder.ISummary,
              delivery: null,
              createdAt: toISOStringSafe(input.created_at),
              updatedAt: toISOStringSafe(input.updated_at),
            } satisfies IEcommerceMallShipment.ISummary,
            customer: input.delivery.customer
              ? await EcommerceMallCustomerAtSummaryTransformer.transform(
                  input.delivery.customer,
                )
              : null,
            deliveredAt: toISOStringSafe(input.delivery.delivered_at),
            isAutoDelivered: input.delivery.is_auto_delivered,
            created_at: toISOStringSafe(input.delivery.created_at),
            updated_at: toISOStringSafe(input.delivery.updated_at),
            deletedAt: input.delivery.deleted_at
              ? toISOStringSafe(input.delivery.deleted_at)
              : null,
          }
        : null,
    };
  }
}
