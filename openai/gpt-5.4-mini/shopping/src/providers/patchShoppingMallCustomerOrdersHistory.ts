import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
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

export async function patchShoppingMallCustomerOrdersHistory(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    shopping_mall_customer_id: props.customer.id,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
  } satisfies Prisma.shopping_mall_ordersWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where,
    orderBy: { placed_at: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      order_number: true,
      status: true,
      subtotal_amount: true,
      shipping_fee_amount: true,
      discount_amount: true,
      total_amount: true,
      placed_at: true,
      paid_at: true,
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
  });
  const total = await MyGlobal.prisma.shopping_mall_orders.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((order) => ({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      subtotal_amount: order.subtotal_amount,
      shipping_fee_amount: order.shipping_fee_amount,
      discount_amount: order.discount_amount,
      total_amount: order.total_amount,
      placed_at: order.placed_at.toISOString(),
      paid_at: order.paid_at === null ? null : order.paid_at.toISOString(),
      created_at: order.created_at.toISOString(),
      updated_at: order.updated_at.toISOString(),
      deleted_at:
        order.deleted_at === null ? null : order.deleted_at.toISOString(),
      customer: {
        id: order.customer.id,
        email: order.customer.email,
        accountStatus: order.customer.account_status,
        bannedAt:
          order.customer.banned_at === null
            ? null
            : order.customer.banned_at.toISOString(),
        deletedAt:
          order.customer.deleted_at === null
            ? null
            : order.customer.deleted_at.toISOString(),
        createdAt: order.customer.created_at.toISOString(),
        updatedAt: order.customer.updated_at.toISOString(),
      },
      shippingAddress:
        order.shippingAddress === null
          ? null
          : ({
              id: order.shippingAddress.id,
              customerProfile: {
                id: order.shippingAddress.customerProfile.id,
              },
              recipientName: order.shippingAddress.recipient_name,
              phoneNumber: order.shippingAddress.phone_number,
              streetAddress: order.shippingAddress.street_address,
              city: order.shippingAddress.city,
              stateProvince: order.shippingAddress.state_province,
              postalCode: order.shippingAddress.postal_code,
              country: order.shippingAddress.country,
              isDefault: order.shippingAddress.is_default,
              createdAt: order.shippingAddress.created_at.toISOString(),
              updatedAt: order.shippingAddress.updated_at.toISOString(),
              deletedAt:
                order.shippingAddress.deleted_at === null
                  ? null
                  : order.shippingAddress.deleted_at.toISOString(),
            } satisfies IShoppingMallShippingAddress.ISummary),
    })),
  };
}
