import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminPaymentsPaymentId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPayment> {
  // Find the payment by ID
  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.paymentId },
  });
  if (payment === null) {
    throw new HttpException("Payment record not found.", 404);
  }
  if (payment.deleted_at !== null) {
    throw new HttpException("Payment record is already deleted.", 400);
  }

  // Soft delete: set deleted_at to now (ISO string)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_payments.update({
    where: { id: props.paymentId },
    data: { deleted_at: now, updated_at: now },
  });

  // Load referenced customer and provider summaries
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: updated.customer_id },
  });

  if (customer === null) {
    throw new HttpException("Payment customer record not found.", 500);
  }

  const provider =
    await MyGlobal.prisma.shopping_mall_external_payment_providers.findUnique({
      where: { id: updated.provider_id },
    });

  if (provider === null) {
    throw new HttpException("Payment provider record not found.", 500);
  }

  return {
    id: updated.id,
    customer: {
      id: customer.id,
      name: customer.name,
    },
    provider: {
      id: provider.id,
      name: provider.provider_name,
      provider_code: provider.provider_code,
      status: provider.status,
      description: provider.description,
      created_at: toISOStringSafe(provider.created_at),
      updated_at: toISOStringSafe(provider.updated_at),
      deleted_at: provider.deleted_at
        ? toISOStringSafe(provider.deleted_at)
        : null,
    },
    amount: updated.amount,
    currency: updated.currency,
    method_type: updated.method_type,
    status: updated.status,
    external_payment_id: updated.external_payment_id,
    transaction_token: updated.transaction_token,
    requested_at: toISOStringSafe(updated.requested_at),
    processed_at: updated.processed_at
      ? toISOStringSafe(updated.processed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
