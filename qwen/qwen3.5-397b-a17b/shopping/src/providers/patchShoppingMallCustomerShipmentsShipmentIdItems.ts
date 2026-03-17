import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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

export async function patchShoppingMallCustomerShipmentsShipmentIdItems(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.IRequest;
}): Promise<IPageIShoppingMallShipmentItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_order_id: true,
      },
    });
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: shipment.shopping_mall_order_id,
      customer_id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const validSortFields: Record<string, string> = {
    quantity: "quantity",
    unit_price: "unit_price",
    status: "status",
    created_at: "created_at",
  };
  const sortParam = props.body.sort?.[0] ?? "created_at,desc";
  const [sortFieldRaw, sortDirectionRaw] = sortParam.split(",");
  const sortField = validSortFields[sortFieldRaw] ?? "created_at";
  const sortDirection: "asc" | "desc" =
    sortDirectionRaw === "asc" ? "asc" : "desc";
  const whereInput: Prisma.shopping_mall_shipment_itemsWhereInput = {
    shipment_id: props.shipmentId,
    deleted_at: null,
    orderItem: {
      deleted_at: null,
    },
  };
  if (props.body.status !== undefined) {
    whereInput.orderItem = {
      deleted_at: null,
      status: props.body.status,
    };
  }
  const orderByInput: Prisma.shopping_mall_shipment_itemsOrderByWithRelationInput =
    {
      orderItem: {
        [sortField]: sortDirection,
      },
    };
  const data = await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      orderItem: {
        select: {
          id: true,
          quantity: true,
          unit_price: true,
          status: true,
          created_at: true,
          order: {
            select: {
              id: true,
              order_number: true,
              total_price: true,
              created_at: true,
            },
          },
          productSnapshot: {
            select: {
              id: true,
              name: true,
              base_price: true,
              snapshot_at: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  parent_category_id: true,
                  created_at: true,
                },
              },
            },
          },
          productVariantSnapshot: {
            select: {
              id: true,
              sku_code: true,
              option_values: true,
              price: true,
              stock_quantity: true,
              snapshot_at: true,
            },
          },
          seller: {
            select: {
              id: true,
              email: true,
              shop_name: true,
              shop_description: true,
              logo_image_url: true,
              approval_status: true,
              suspended: true,
              created_at: true,
              approved_by_admin_id: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_shipment_items.count({
    where: whereInput,
  });
  const transformedData = data.map((item) => {
    const orderItem = item.orderItem;
    const productSnapshot = orderItem.productSnapshot;
    const category = productSnapshot.category;
    const seller = orderItem.seller;
    const productVariantSnapshot = orderItem.productVariantSnapshot;
    const order = orderItem.order;
    const categorySummary: IShoppingMallCategory.ISummary = {
      id: category.id,
      name: category.name,
      description: category.description,
      parent: undefined,
      created_at: toISOStringSafe(category.created_at),
    };
    const sellerSummary: IShoppingMallSeller.ISummary = {
      id: seller.id,
      email: seller.email,
      shop_name: seller.shop_name,
      shop_description: seller.shop_description,
      logo_image_url: seller.logo_image_url,
      approval_status: typia.assert<"PENDING" | "APPROVED" | "REJECTED">(
        seller.approval_status,
      ),
      suspended: seller.suspended,
      created_at: toISOStringSafe(seller.created_at),
      approvedByAdmin: null,
    };
    const productSnapshotSummary: IShoppingMallProductSnapshot.ISummary = {
      id: productSnapshot.id,
      name: productSnapshot.name,
      base_price: productSnapshot.base_price,
      snapshot_at: toISOStringSafe(productSnapshot.snapshot_at),
      category: categorySummary,
      seller: sellerSummary,
    };
    const productVariantSnapshotSummary: IShoppingMallProductVariantSnapshot.ISummary =
      {
        id: productVariantSnapshot.id,
        sku_code: productVariantSnapshot.sku_code,
        option_values: JSON.parse(productVariantSnapshot.option_values) as {
          [key: string]: string;
        },
        price: productVariantSnapshot.price,
        stock_quantity: productVariantSnapshot.stock_quantity,
        snapshot_at: toISOStringSafe(productVariantSnapshot.snapshot_at),
      };
    const orderSummary: IShoppingMallOrder.ISummary = {
      id: order.id,
      orderNumber: order.order_number,
      totalPrice: order.total_price,
      createdAt: toISOStringSafe(order.created_at),
      status: "PAID" as const,
    };
    const orderItemSummary: IShoppingMallOrderItem.ISummary = {
      id: orderItem.id,
      quantity: orderItem.quantity,
      unit_price: orderItem.unit_price,
      status: typia.assert<
        "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED"
      >(orderItem.status),
      order: orderSummary,
      productSnapshot: productSnapshotSummary,
      productVariantSnapshot: productVariantSnapshotSummary,
      seller: sellerSummary,
      created_at: toISOStringSafe(orderItem.created_at),
    };
    const shipmentItemSummary: IShoppingMallShipmentItem.ISummary = {
      id: item.id,
      orderItem: orderItemSummary,
    };
    return shipmentItemSummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
