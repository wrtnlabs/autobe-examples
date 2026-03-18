import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallPaymentTransformer } from "../transformers/ShoppingMallPaymentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberPayments(props: {
  member: MemberPayload;
  body: IShoppingMallPayment.IRequest;
}): Promise<IShoppingMallPayment> {
  // Determine desired payment outcome from request payload.
  const isSuccess = props.body.paid_at !== null;
  if (isSuccess) {
    // On success, provider confirms paid_at; error fields must be null.
    if (props.body.error_code !== null) {
      throw new HttpException(
        "error_code must be null when paid_at is provided",
        400,
      );
    }
    if (props.body.error_message !== null) {
      throw new HttpException(
        "error_message must be null when paid_at is provided",
        400,
      );
    }
  } else {
    // On failure, paid_at must be null.
    if (props.body.paid_at !== null) {
      throw new HttpException("paid_at must be null when payment failed", 400);
    }
    // error fields can be null, but if provided they should be non-empty.
    if (
      props.body.error_code !== null &&
      props.body.error_code.trim().length === 0
    ) {
      throw new HttpException(
        "error_code must not be empty when provided",
        400,
      );
    }
    if (
      props.body.error_message !== null &&
      props.body.error_message.trim().length === 0
    ) {
      throw new HttpException(
        "error_message must not be empty when provided",
        400,
      );
    }
  }
  // Authorization + targeted lookup.
  // We rely on payment -> orderForPayment relation (optional) to scope by member.
  // Also validate provider reference/provider match.
  const payment = await MyGlobal.prisma.shopping_mall_payments.findFirstOrThrow(
    {
      where: {
        provider_reference: props.body.provider_reference,
        provider: props.body.provider,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        paid_at: true,
        error_code: true,
        error_message: true,
        orderForPayment: {
          select: {
            shopping_customer_id: true,
          },
        },
      },
    },
  );
  if (payment.orderForPayment === null) {
    // In this schema, orders are created only after payment succeeds.
    // Without an existing order, we cannot verify customer ownership.
    // Therefore, we must reject to avoid cross-tenant payment updates.
    throw new HttpException(
      "Payment attempt is not linked to a customer order",
      403,
    );
  }
  if (payment.orderForPayment.shopping_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Reload inside tx with full fields required for idempotency.
    const current = await tx.shopping_mall_payments.findUniqueOrThrow({
      where: { id: payment.id },
      select: {
        id: true,
        status: true,
        paid_at: true,
        error_code: true,
        error_message: true,
      },
    });
    const currentIsSuccess = current.paid_at !== null;
    // Make transitions idempotent and reject contradictory transitions.
    if (currentIsSuccess && !isSuccess) {
      throw new HttpException("Cannot transition from success to failure", 400);
    }
    await tx.shopping_mall_payments.update({
      where: { id: current.id },
      data: {
        status: props.body.status,
        paid_at: props.body.paid_at,
        error_code: props.body.error_code,
        error_message: props.body.error_message,
      },
    });
    if (isSuccess) {
      const existingOrder = await tx.shopping_mall_orders.findUnique({
        where: { shopping_payment_id: current.id },
        select: { id: true },
      });
      if (existingOrder === null) {
        // Required order placement context (shipping fields) is not provided by this endpoint.
        // The platform spec expects those to be available, but in this operation signature
        // we cannot access them. Reject to prevent creating incomplete orders.
        throw new HttpException(
          "Missing checkout context to create order",
          400,
        );
      }
    }
    const updated = await tx.shopping_mall_payments.findUniqueOrThrow({
      where: { id: current.id },
      ...ShoppingMallPaymentTransformer.select(),
    });
    return await ShoppingMallPaymentTransformer.transform(updated);
  });
  return result;
}
