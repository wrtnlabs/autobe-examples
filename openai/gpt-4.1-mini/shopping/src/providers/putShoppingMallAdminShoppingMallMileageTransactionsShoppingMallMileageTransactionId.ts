import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallMileageTransactionsShoppingMallMileageTransactionId(props: {
  admin: AdminPayload;
  shoppingMallMileageTransactionId: string & tags.Format<"uuid">;
  body: IShoppingMallMileageTransaction.IUpdate;
}): Promise<IShoppingMallMileageTransaction> {
  const existing =
    await MyGlobal.prisma.shopping_mall_mileage_transactions.findUnique({
      where: { id: props.shoppingMallMileageTransactionId },
    });

  if (!existing) {
    throw new HttpException("Mileage transaction not found", 404);
  }

  const updated =
    await MyGlobal.prisma.shopping_mall_mileage_transactions.update({
      where: { id: props.shoppingMallMileageTransactionId },
      data: {
        amount: props.body.points,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  const customerRaw = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: updated.shopping_mall_customer_id },
  });

  if (!customerRaw) {
    throw new HttpException("Customer not found", 404);
  }

  const customer: IShoppingMallCustomer.ISummary = {
    id: customerRaw.id,
    email: customerRaw.email,
    name: customerRaw.name,
    status: (customerRaw as any).status ?? "",
    created_at: toISOStringSafe(customerRaw.created_at),
    updated_at: customerRaw.updated_at
      ? toISOStringSafe(customerRaw.updated_at)
      : undefined,
  };

  let orderSummary: IShoppingMallOrder.ISummary | undefined = undefined;

  const orderId = (updated as any).shopping_mall_order_id;
  if (orderId !== null && orderId !== undefined) {
    const foundOrder = await MyGlobal.prisma.shopping_mall_orders.findUnique({
      where: { id: orderId as string },
    });
    if (!foundOrder) {
      throw new HttpException("Order not found", 404);
    }

    const orderCustomerRaw =
      await MyGlobal.prisma.shopping_mall_customers.findUnique({
        where: { id: foundOrder.shopping_mall_customer_id },
      });
    if (!orderCustomerRaw) {
      throw new HttpException("Order customer not found", 404);
    }

    const orderSellerRaw =
      await MyGlobal.prisma.shopping_mall_sellers.findUnique({
        where: { id: (foundOrder as any).shopping_mall_seller_id as string },
      });
    if (!orderSellerRaw) {
      throw new HttpException("Order seller not found", 404);
    }

    const orderCustomer: IShoppingMallCustomer.ISummary = {
      id: orderCustomerRaw.id,
      email: orderCustomerRaw.email,
      name: orderCustomerRaw.name,
      status: (orderCustomerRaw as any).status ?? "",
      created_at: toISOStringSafe(orderCustomerRaw.created_at),
      updated_at: orderCustomerRaw.updated_at
        ? toISOStringSafe(orderCustomerRaw.updated_at)
        : undefined,
    };

    const orderSeller: IShoppingMallSeller.ISummary = {
      id: orderSellerRaw.id,
      name: orderSellerRaw.name,
      email: orderSellerRaw.email,
      status: (orderSellerRaw as any).status ?? "",
      business_status:
        orderSellerRaw.business_status === "approved" ||
        orderSellerRaw.business_status === "pending" ||
        orderSellerRaw.business_status === "rejected"
          ? orderSellerRaw.business_status
          : "pending",
      created_at: toISOStringSafe(orderSellerRaw.created_at),
      updated_at: orderSellerRaw.updated_at
        ? toISOStringSafe(orderSellerRaw.updated_at)
        : toISOStringSafe(orderSellerRaw.created_at),
      deleted_at:
        orderSellerRaw.deleted_at === null
          ? null
          : toISOStringSafe(orderSellerRaw.deleted_at),
    };

    orderSummary = {
      id: foundOrder.id,
      order_number: foundOrder.order_number ?? "",
      status:
        foundOrder.status === "approved" ||
        foundOrder.status === "pending" ||
        foundOrder.status === "rejected"
          ? foundOrder.status
          : "pending",
      total_amount: foundOrder.total_amount ?? 0,
      customer: orderCustomer,
      seller: orderSeller,
      created_at: toISOStringSafe(foundOrder.created_at),
      updated_at: toISOStringSafe(foundOrder.updated_at),
    };
  }

  return {
    id: updated.id,
    transaction_type: updated.type ?? "",
    points: updated.amount,
    description: updated.memo ?? "",
    status: "active",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    customer: customer,
    order: orderSummary,
  } satisfies IShoppingMallMileageTransaction;
}
