import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function getShoppingMallAdminPaymentsPaymentId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPayment> {
  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.paymentId },
    include: {
      customer: true,
      provider: true,
    },
  });

  if (!payment) {
    throw new HttpException("Payment not found", 404);
  }

  if (!payment.customer) {
    throw new HttpException("Associated customer not found", 404);
  }
  if (!payment.provider) {
    throw new HttpException("Associated payment provider not found", 404);
  }

  return {
    id: payment.id,
    customer: {
      id: payment.customer.id,
      name: payment.customer.name,
    },
    provider: {
      id: payment.provider.id,
      name: payment.provider.provider_name,
      provider_code: payment.provider.provider_code,
      status: payment.provider.status,
      description: payment.provider.description,
      created_at: toISOStringSafe(payment.provider.created_at),
      updated_at: toISOStringSafe(payment.provider.updated_at),
      deleted_at:
        payment.provider.deleted_at === null
          ? null
          : toISOStringSafe(payment.provider.deleted_at),
    },
    amount: payment.amount,
    currency: payment.currency,
    method_type: payment.method_type,
    status: payment.status,
    external_payment_id: payment.external_payment_id,
    transaction_token: payment.transaction_token,
    requested_at: toISOStringSafe(payment.requested_at),
    processed_at:
      payment.processed_at === null
        ? null
        : toISOStringSafe(payment.processed_at),
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
    deleted_at:
      payment.deleted_at === null ? null : toISOStringSafe(payment.deleted_at),
  };
}
