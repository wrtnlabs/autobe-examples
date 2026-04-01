import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallInventoryRecordTransformer } from "../transformers/EcommerceMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerInventoryRecordsInventoryRecordId(props: {
  seller: SellerPayload;
  inventoryRecordId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallInventoryRecord> {
  const inventoryRecord =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findUniqueOrThrow({
      where: {
        id: props.inventoryRecordId,
        deleted_at: null,
      },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
        order: true,
        cancellationRequest: true,
        refundRequest: true,
      },
    });
  const product = inventoryRecord.variant.product;
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallInventoryRecordTransformer.transform({
    id: inventoryRecord.id,
    quantity_change: inventoryRecord.quantity_change,
    remaining_quantity: inventoryRecord.remaining_quantity,
    reason: inventoryRecord.reason,
    type: inventoryRecord.type,
    description: inventoryRecord.description,
    created_at: inventoryRecord.created_at,
    updated_at: inventoryRecord.updated_at,
    deleted_at: inventoryRecord.deleted_at,
    snapshots: [],
    variant: {
      id: inventoryRecord.variant.id,
      sku: inventoryRecord.variant.sku,
      options: inventoryRecord.variant.options,
      base_price: inventoryRecord.variant.base_price,
      sale_price: inventoryRecord.variant.sale_price,
      stock_quantity: inventoryRecord.variant.stock_quantity,
      reserved_quantity: inventoryRecord.variant.reserved_quantity,
      status: inventoryRecord.variant.status,
      sort_order: inventoryRecord.variant.sort_order,
      is_default: inventoryRecord.variant.is_default,
      product: {
        id: product.id,
        name: product.name,
        base_price: product.base_price,
        slug: product.slug,
        status: product.status,
        seller: {
          email: "",
          created_at: new Date(),
          updated_at: new Date(),
          id: "",
          deleted_at: null,
          password_hash: "",
        },
        created_at: product.created_at,
        updated_at: product.updated_at,
        reviews: [],
        wishlistItems: [],
        variantSnapshots: [],
        images: [],
        productSnapshots: [],
        entitySnapshots: [],
        description: product.description,
        category: undefined as any,
        variants: [],
        deleted_at: product.deleted_at,
      },
      created_at: inventoryRecord.variant.created_at,
      updated_at: inventoryRecord.variant.updated_at,
      deleted_at: inventoryRecord.variant.deleted_at,
      inventoryRecords: [],
      variantSnapshots: [],
      variantOptions: [],
    },
    order: inventoryRecord.order
      ? {
          id: inventoryRecord.order.id,
          order_number: inventoryRecord.order.order_number,
          total_price: inventoryRecord.order.total_price,
          status: inventoryRecord.order.status,
          shippingAddress: undefined as any,
          created_at: inventoryRecord.order.created_at,
          updated_at: inventoryRecord.order.updated_at,
          deleted_at: inventoryRecord.order.deleted_at,
          snapshots: [],
          customer: undefined as any,
          orderItems: [],
          shipments: [],
          inventoryRecords: [],
          reviews: [],
        }
      : null,
    cancellationRequest: inventoryRecord.cancellationRequest
      ? {
          id: inventoryRecord.cancellationRequest.id,
          status: inventoryRecord.cancellationRequest.status,
          reason: inventoryRecord.cancellationRequest.reason,
          created_at: inventoryRecord.cancellationRequest.created_at,
          updated_at: inventoryRecord.cancellationRequest.updated_at,
          deleted_at: inventoryRecord.cancellationRequest.deleted_at,
          customer: undefined as any,
          orderItem: undefined as any,
        }
      : null,
    refundRequest: inventoryRecord.refundRequest
      ? {
          id: inventoryRecord.refundRequest.id,
          refund_code: inventoryRecord.refundRequest.refund_code,
          status: inventoryRecord.refundRequest.status,
          customer: undefined as any,
          orderItem: undefined as any,
          delivery_date: inventoryRecord.refundRequest.delivery_date,
          submitted_at: inventoryRecord.refundRequest.submitted_at,
          decision_at: inventoryRecord.refundRequest.decision_at,
          processed_at: inventoryRecord.refundRequest.processed_at,
          created_at: inventoryRecord.refundRequest.created_at,
          updated_at: inventoryRecord.refundRequest.updated_at,
          deleted_at: inventoryRecord.refundRequest.deleted_at,
        }
      : null,
  });
}
