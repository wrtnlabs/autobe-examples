import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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

export async function patchShoppingMallCustomerItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    order: {
      shopping_mall_customer_id: props.customer.id,
      ...(props.body.orderId !== undefined && { id: props.body.orderId }),
      ...(props.body.orderNumber !== undefined && {
        order_number: props.body.orderNumber,
      }),
    },
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.productVariantId !== undefined && {
      shopping_mall_product_variant_id: props.body.productVariantId,
    }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const orderBy = (
    props.body.sort === "oldest"
      ? { created_at: "asc" as const }
      : props.body.sort === "status"
        ? { status: "asc" as const }
        : props.body.sort === "quantity"
          ? { quantity: "desc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      quantity: true,
      status: true,
      shipped_at: true,
      delivered_at: true,
      cancelled_at: true,
      refunded_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      order: {
        select: {
          id: true,
          order_number: true,
          placed_at: true,
          status: true,
          subtotal_amount: true,
          shipping_fee_amount: true,
          discount_amount: true,
          total_amount: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          customer: {
            select: {
              id: true,
              email: true,
              account_status: true,
              banned_at: true,
              deleted_at: true,
              created_at: true,
              updated_at: true,
            },
          },
          shippingAddress: {
            select: {
              id: true,
              customerProfile: {
                select: {
                  id: true,
                },
              },
              recipient_name: true,
              phone_number: true,
              street_address: true,
              city: true,
              state_province: true,
              postal_code: true,
              country: true,
              is_default: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          override_price: true,
          stock_quantity: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      order: {
        id: item.order.id,
        order_number: item.order.order_number,
        placed_at: toISOStringSafe(item.order.placed_at),
        paid_at: toISOStringSafe(item.order.placed_at),
        status: item.order.status,
        subtotal_amount: item.order.subtotal_amount,
        shipping_fee_amount: item.order.shipping_fee_amount,
        discount_amount: item.order.discount_amount,
        total_amount: item.order.total_amount,
        created_at: toISOStringSafe(item.order.created_at),
        updated_at: toISOStringSafe(item.order.updated_at),
        deleted_at:
          item.order.deleted_at === null
            ? null
            : toISOStringSafe(item.order.deleted_at),
        customer: {
          id: item.order.customer.id,
          email: item.order.customer.email,
          accountStatus: item.order.customer.account_status,
          bannedAt:
            item.order.customer.banned_at === null
              ? null
              : toISOStringSafe(item.order.customer.banned_at),
          deletedAt:
            item.order.customer.deleted_at === null
              ? null
              : toISOStringSafe(item.order.customer.deleted_at),
          createdAt: toISOStringSafe(item.order.customer.created_at),
          updatedAt: toISOStringSafe(item.order.customer.updated_at),
        },
        shippingAddress:
          item.order.shippingAddress === null
            ? null
            : {
                id: item.order.shippingAddress.id,
                customerProfile: {
                  id: item.order.shippingAddress.customerProfile.id,
                },
                recipientName: item.order.shippingAddress.recipient_name,
                phoneNumber: item.order.shippingAddress.phone_number,
                streetAddress: item.order.shippingAddress.street_address,
                city: item.order.shippingAddress.city,
                stateProvince: item.order.shippingAddress.state_province,
                postalCode: item.order.shippingAddress.postal_code,
                country: item.order.shippingAddress.country,
                isDefault: item.order.shippingAddress.is_default,
                createdAt: toISOStringSafe(
                  item.order.shippingAddress.created_at,
                ),
                updatedAt: toISOStringSafe(
                  item.order.shippingAddress.updated_at,
                ),
                deletedAt:
                  item.order.shippingAddress.deleted_at === null
                    ? null
                    : toISOStringSafe(item.order.shippingAddress.deleted_at),
              },
      },
      productVariant: {
        id: item.productVariant.id,
        skuCode: item.productVariant.sku_code,
        overridePrice: item.productVariant.override_price,
        stockQuantity: item.productVariant.stock_quantity,
        createdAt: toISOStringSafe(item.productVariant.created_at),
        updatedAt: toISOStringSafe(item.productVariant.updated_at),
        deletedAt:
          item.productVariant.deleted_at === null
            ? null
            : toISOStringSafe(item.productVariant.deleted_at),
      },
      quantity: item.quantity,
      status: item.status,
      shippedAt:
        item.shipped_at === null ? null : toISOStringSafe(item.shipped_at),
      deliveredAt:
        item.delivered_at === null ? null : toISOStringSafe(item.delivered_at),
      cancelledAt:
        item.cancelled_at === null ? null : toISOStringSafe(item.cancelled_at),
      refundedAt:
        item.refunded_at === null ? null : toISOStringSafe(item.refunded_at),
      createdAt: toISOStringSafe(item.created_at),
      updatedAt: toISOStringSafe(item.updated_at),
      deletedAt:
        item.deleted_at === null ? null : toISOStringSafe(item.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
