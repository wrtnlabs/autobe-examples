import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
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

export async function patchShoppingMallCustomerOrderItemsOrderItemIdSnapshots(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItemSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderItemSnapshot.ISummary> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        order: {
          select: {
            shopping_mall_customer_id: true,
          },
        },
      },
    });
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    shopping_mall_order_item_id: props.orderItemId,
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          OR: [
            {
              product_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              product_description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              variant_sku: { contains: props.body.search, mode: "insensitive" },
            },
            {
              variant_option_values: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              seller_shop_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              seller_shop_description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.shopping_mall_order_item_snapshotsWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
      where,
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
      skip,
      take: limit,
      select: {
        id: true,
        product_name: true,
        product_description: true,
        variant_sku: true,
        variant_option_values: true,
        seller_shop_name: true,
        seller_shop_description: true,
        seller_logo_image: true,
        quantity: true,
        unit_price: true,
        total_price: true,
        created_at: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_order_item_snapshots.count({
    where,
  });
  const pagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    data: data.map(
      (record) =>
        ({
          id: record.id,
          orderItem: {
            id: props.orderItemId,
            order: {
              id: orderItem.id,
              order_number: "",
              status: "",
              subtotal_amount: 0,
              shipping_fee_amount: 0,
              discount_amount: 0,
              total_amount: 0,
              placed_at: toISOStringSafe(new Date(0)),
              paid_at: null,
              created_at: toISOStringSafe(new Date(0)),
              updated_at: toISOStringSafe(new Date(0)),
              deleted_at: null,
              customer: {
                id: props.customer.id,
                email: "",
                accountStatus: "",
                bannedAt: null,
                deletedAt: null,
                createdAt: toISOStringSafe(new Date(0)),
                updatedAt: toISOStringSafe(new Date(0)),
              } satisfies IShoppingMallCustomer.ISummary,
              shippingAddress: null,
            } satisfies IShoppingMallOrder.ISummary,
            productVariant: {
              id: props.orderItemId,
              skuCode: "",
              overridePrice: null,
              stockQuantity: 0,
              createdAt: toISOStringSafe(new Date(0)),
              updatedAt: toISOStringSafe(new Date(0)),
              deletedAt: null,
            } satisfies IShoppingMallProductVariant.ISummary,
            quantity: 0,
            status: "",
            shippedAt: null,
            deliveredAt: null,
            cancelledAt: null,
            refundedAt: null,
            createdAt: toISOStringSafe(new Date(0)),
            updatedAt: toISOStringSafe(new Date(0)),
            deletedAt: null,
          } satisfies IShoppingMallOrderItem.ISummary,
          productName: record.product_name,
          productDescription: record.product_description,
          variantSku: record.variant_sku,
          variantOptionValues: record.variant_option_values,
          sellerShopName: record.seller_shop_name,
          sellerShopDescription: record.seller_shop_description,
          sellerLogoImage: record.seller_logo_image,
          quantity: record.quantity,
          unitPrice: record.unit_price,
          totalPrice: record.total_price,
          createdAt: toISOStringSafe(record.created_at),
        }) satisfies IShoppingMallOrderItemSnapshot.ISummary,
    ),
    pagination,
  };
}
