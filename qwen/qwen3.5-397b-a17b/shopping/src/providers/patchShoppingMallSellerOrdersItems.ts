import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerOrdersItems(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.date_from !== undefined && {
      created_at: {
        gte: new Date(props.body.date_from),
      },
    }),
    ...(props.body.date_to !== undefined && {
      created_at: {
        lte: new Date(props.body.date_to),
      },
    }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const orderByInput = {
    created_at: "desc" as const,
  } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
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
          order_items: {
            select: {
              status: true,
            },
          },
        },
      },
      productSnapshot: {
        select: {
          id: true,
          name: true,
          base_price: true,
          snapshot_at: true,
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
              approvedByAdmin: {
                select: {
                  id: true,
                  email: true,
                  grade: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
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
          approvedByAdmin: {
            select: {
              id: true,
              email: true,
              grade: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: whereInput,
  });
  const computeOrderStatus = (
    items: Array<{
      status: string;
    }>,
  ):
    | "PAID"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED"
    | "PARTIALLY_COMPLETED" => {
    const statuses = items.map((i) => i.status);
    const allDelivered = statuses.every((s) => s === "DELIVERED");
    const allCancelled = statuses.every((s) => s === "CANCELLED");
    const allRefunded = statuses.every((s) => s === "REFUNDED");
    const allPaid = statuses.every((s) => s === "PAID");
    const anyShipped = statuses.some((s) => s === "SHIPPED");
    const anyDelivered = statuses.some((s) => s === "DELIVERED");
    if (allDelivered) return "DELIVERED";
    if (allCancelled) return "CANCELLED";
    if (allRefunded) return "REFUNDED";
    if (allPaid) return "PAID";
    if (anyDelivered || anyShipped) return "PARTIALLY_COMPLETED";
    return "PAID";
  };
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((item) => {
      const orderStatus = computeOrderStatus(item.order.order_items);
      return {
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        status: typia.assert<
          "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED"
        >(item.status),
        order: {
          id: item.order.id,
          orderNumber: item.order.order_number,
          totalPrice: item.order.total_price,
          createdAt: toISOStringSafe(item.order.created_at),
          status: orderStatus,
        } satisfies IShoppingMallOrder.ISummary,
        productSnapshot: {
          id: item.productSnapshot.id,
          name: item.productSnapshot.name,
          base_price: item.productSnapshot.base_price,
          snapshot_at: toISOStringSafe(item.productSnapshot.snapshot_at),
          seller: {
            id: item.productSnapshot.seller.id,
            email: item.productSnapshot.seller.email,
            shop_name: item.productSnapshot.seller.shop_name,
            shop_description:
              item.productSnapshot.seller.shop_description ?? null,
            logo_image_url: item.productSnapshot.seller.logo_image_url ?? null,
            approval_status: typia.assert<"PENDING" | "APPROVED" | "REJECTED">(
              item.productSnapshot.seller.approval_status,
            ),
            suspended: item.productSnapshot.seller.suspended,
            created_at: toISOStringSafe(item.productSnapshot.seller.created_at),
            approvedByAdmin: item.productSnapshot.seller.approvedByAdmin
              ? ({
                  id: item.productSnapshot.seller.approvedByAdmin.id,
                  email: item.productSnapshot.seller.approvedByAdmin.email,
                  grade: item.productSnapshot.seller.approvedByAdmin.grade,
                  created_at: toISOStringSafe(
                    item.productSnapshot.seller.approvedByAdmin.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    item.productSnapshot.seller.approvedByAdmin.updated_at,
                  ),
                  deleted_at: item.productSnapshot.seller.approvedByAdmin
                    .deleted_at
                    ? toISOStringSafe(
                        item.productSnapshot.seller.approvedByAdmin.deleted_at,
                      )
                    : null,
                } satisfies IShoppingMallAdmin.ISummary)
              : null,
          } satisfies IShoppingMallSeller.ISummary,
          category: {
            id: item.productSnapshot.category.id,
            name: item.productSnapshot.category.name,
            description: item.productSnapshot.category.description ?? undefined,
            parent: undefined,
            created_at: toISOStringSafe(
              item.productSnapshot.category.created_at,
            ),
          } satisfies IShoppingMallCategory.ISummary,
        } satisfies IShoppingMallProductSnapshot.ISummary,
        productVariantSnapshot: {
          id: item.productVariantSnapshot.id,
          sku_code: item.productVariantSnapshot.sku_code,
          option_values: JSON.parse(
            item.productVariantSnapshot.option_values,
          ) as {
            [key: string]: string;
          },
          price: item.productVariantSnapshot.price ?? null,
          stock_quantity: item.productVariantSnapshot.stock_quantity,
          snapshot_at: toISOStringSafe(item.productVariantSnapshot.snapshot_at),
        } satisfies IShoppingMallProductVariantSnapshot.ISummary,
        seller: {
          id: item.seller.id,
          email: item.seller.email,
          shop_name: item.seller.shop_name,
          shop_description: item.seller.shop_description ?? null,
          logo_image_url: item.seller.logo_image_url ?? null,
          approval_status: typia.assert<"PENDING" | "APPROVED" | "REJECTED">(
            item.seller.approval_status,
          ),
          suspended: item.seller.suspended,
          created_at: toISOStringSafe(item.seller.created_at),
          approvedByAdmin: item.seller.approvedByAdmin
            ? ({
                id: item.seller.approvedByAdmin.id,
                email: item.seller.approvedByAdmin.email,
                grade: item.seller.approvedByAdmin.grade,
                created_at: toISOStringSafe(
                  item.seller.approvedByAdmin.created_at,
                ),
                updated_at: toISOStringSafe(
                  item.seller.approvedByAdmin.updated_at,
                ),
                deleted_at: item.seller.approvedByAdmin.deleted_at
                  ? toISOStringSafe(item.seller.approvedByAdmin.deleted_at)
                  : null,
              } satisfies IShoppingMallAdmin.ISummary)
            : null,
        } satisfies IShoppingMallSeller.ISummary,
        created_at: toISOStringSafe(item.created_at),
      };
    }),
  };
}
