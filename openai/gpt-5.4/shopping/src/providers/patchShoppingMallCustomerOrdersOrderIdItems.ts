import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id)
    throw new HttpException("Forbidden", 403);
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    shopping_mall_order_id: props.orderId,
    ...(props.body.status !== undefined
      ? {
          status: props.body.status,
        }
      : {}),
    ...(props.body.shopping_mall_seller_id !== undefined
      ? {
          shopping_mall_seller_id: props.body.shopping_mall_seller_id,
        }
      : {}),
    ...(props.body.shopping_mall_product_variant_id !== undefined
      ? {
          shopping_mall_product_variant_id:
            props.body.shopping_mall_product_variant_id,
        }
      : {}),
    ...(props.body.shopping_mall_shipment_id !== undefined
      ? {
          shopping_mall_shipment_id: props.body.shopping_mall_shipment_id,
        }
      : {}),
    ...(props.body.delivered_at === null
      ? {
          delivered_at: null,
        }
      : {}),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const orderBy =
    props.body.sort === undefined || props.body.sort === "created_at_desc"
      ? ({
          created_at: "desc",
        } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput)
      : props.body.sort === "created_at_asc"
        ? ({
            created_at: "asc",
          } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput)
        : props.body.sort === "updated_at_desc"
          ? ({
              updated_at: "desc",
            } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput)
          : props.body.sort === "updated_at_asc"
            ? ({
                updated_at: "asc",
              } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput)
            : props.body.sort === "delivered_at_desc"
              ? ({
                  delivered_at: "desc",
                } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput)
              : props.body.sort === "delivered_at_asc"
                ? ({
                    delivered_at: "asc",
                  } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput)
                : props.body.sort === "status_desc"
                  ? ({
                      status: "desc",
                    } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput)
                  : props.body.sort === "status_asc"
                    ? ({
                        status: "asc",
                      } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput)
                    : (() => {
                        throw new HttpException("Invalid sort", 400);
                      })();
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      quantity: true,
      unit_price: true,
      status: true,
      delivered_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      seller: {
        select: {
          id: true,
          email: true,
          approval_status: true,
          rejection_reason: true,
          suspended: true,
          banned: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      } satisfies Prisma.shopping_mall_sellersFindManyArgs,
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          option_summary: true,
          price: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
      shipment: {
        select: {
          id: true,
          shipped_at: true,
          delivered_at: true,
          auto_deliver_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          order: {
            select: {
              id: true,
              code: true,
              status: true,
              total_price: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          } satisfies Prisma.shopping_mall_ordersFindManyArgs,
          seller: {
            select: {
              id: true,
              email: true,
              approval_status: true,
              rejection_reason: true,
              suspended: true,
              banned: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          } satisfies Prisma.shopping_mall_sellersFindManyArgs,
        },
      } satisfies Prisma.shopping_mall_shipmentsFindManyArgs,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where,
  });
  return {
    data: data.map(
      (item): IShoppingMallOrderItem.ISummary => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        status: item.status,
        delivered_at: item.delivered_at?.toISOString() ?? null,
        seller: {
          id: item.seller.id,
          email: item.seller.email,
          approval_status: item.seller.approval_status,
          rejection_reason: item.seller.rejection_reason,
          suspended: item.seller.suspended,
          banned: item.seller.banned,
          created_at: item.seller.created_at.toISOString(),
          updated_at: item.seller.updated_at.toISOString(),
          deleted_at: item.seller.deleted_at?.toISOString() ?? null,
        } satisfies IShoppingMallSeller.ISummary,
        productVariant: {
          id: item.productVariant.id,
          sku_code: item.productVariant.sku_code,
          option_summary: item.productVariant.option_summary,
          price: item.productVariant.price,
          created_at: item.productVariant.created_at.toISOString(),
          updated_at: item.productVariant.updated_at.toISOString(),
          deleted_at: item.productVariant.deleted_at?.toISOString() ?? null,
        } satisfies IShoppingMallProductVariant.ISummary,
        shipment: item.shipment
          ? ({
              id: item.shipment.id,
              order: {
                id: item.shipment.order.id,
                code: item.shipment.order.code,
                status: item.shipment.order.status,
                total_price: item.shipment.order.total_price,
                created_at: item.shipment.order.created_at.toISOString(),
                updated_at: item.shipment.order.updated_at.toISOString(),
                deleted_at:
                  item.shipment.order.deleted_at?.toISOString() ?? null,
              } satisfies IShoppingMallOrder.ISummary,
              seller: {
                id: item.shipment.seller.id,
                email: item.shipment.seller.email,
                approval_status: item.shipment.seller.approval_status,
                rejection_reason: item.shipment.seller.rejection_reason,
                suspended: item.shipment.seller.suspended,
                banned: item.shipment.seller.banned,
                created_at: item.shipment.seller.created_at.toISOString(),
                updated_at: item.shipment.seller.updated_at.toISOString(),
                deleted_at:
                  item.shipment.seller.deleted_at?.toISOString() ?? null,
              } satisfies IShoppingMallSeller.ISummary,
              shipped_at: item.shipment.shipped_at.toISOString(),
              delivered_at: item.shipment.delivered_at?.toISOString() ?? null,
              auto_deliver_at: item.shipment.auto_deliver_at.toISOString(),
              created_at: item.shipment.created_at.toISOString(),
              updated_at: item.shipment.updated_at.toISOString(),
              deleted_at: item.shipment.deleted_at?.toISOString() ?? null,
            } satisfies IShoppingMallShipment.ISummary)
          : null,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
        deleted_at: item.deleted_at?.toISOString() ?? null,
      }),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
