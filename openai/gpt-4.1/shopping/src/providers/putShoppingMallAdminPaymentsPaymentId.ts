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

export async function putShoppingMallAdminPaymentsPaymentId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.IUpdate;
}): Promise<IShoppingMallPayment> {
  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.paymentId },
  });

  if (!payment) {
    throw new HttpException("Payment record not found.", 404);
  }

  // Check for any forbidden field updates
  if (
    "amount" in props.body ||
    "currency" in props.body ||
    "transaction_token" in props.body ||
    "external_payment_id" in props.body ||
    "id" in props.body ||
    "customer_id" in props.body ||
    "provider_id" in props.body ||
    "method_type" in props.body ||
    "requested_at" in props.body ||
    "created_at" in props.body
  ) {
    throw new HttpException("Attempt to update immutable fields.", 400);
  }

  // Allowed status transitions (example logic)
  // (Ideally, this would come from a config, for now basic validation)
  if (props.body.status !== undefined) {
    const allowedTransitions: Record<string, string[]> = {
      initiated: [
        "pending",
        "authorized",
        "rejected",
        "completed",
        "refunded",
        "failed",
      ],
      pending: ["authorized", "rejected", "completed", "refunded", "failed"],
      authorized: ["completed", "refunded", "failed"],
      rejected: [],
      completed: ["refunded"],
      refunded: [],
      failed: [],
    };
    const currentStatus = payment.status;
    const nextStatus = props.body.status;
    if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
      throw new HttpException("Invalid status transition.", 400);
    }
  }

  const updateInput: Record<string, unknown> = {
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.processed_at !== undefined && {
      processed_at:
        props.body.processed_at === null ? null : props.body.processed_at,
    }),
    ...(props.body.deleted_at !== undefined && {
      deleted_at: props.body.deleted_at === null ? null : props.body.deleted_at,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  await MyGlobal.prisma.shopping_mall_payments.update({
    where: { id: props.paymentId },
    data: updateInput,
  });

  const updated = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.paymentId },
  });
  if (!updated) {
    throw new HttpException("Payment record disappeared after update.", 500);
  }

  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: updated.customer_id },
  });
  if (!customer) {
    throw new HttpException("Customer record not found.", 404);
  }
  const provider =
    await MyGlobal.prisma.shopping_mall_external_payment_providers.findUnique({
      where: { id: updated.provider_id },
    });
  if (!provider) {
    throw new HttpException("Provider record not found.", 404);
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
      deleted_at:
        provider.deleted_at === null
          ? null
          : toISOStringSafe(provider.deleted_at),
    },
    amount: updated.amount,
    currency: updated.currency,
    method_type: updated.method_type,
    status: updated.status,
    external_payment_id: updated.external_payment_id,
    transaction_token: updated.transaction_token,
    requested_at: toISOStringSafe(updated.requested_at),
    processed_at:
      updated.processed_at === null
        ? null
        : toISOStringSafe(updated.processed_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
