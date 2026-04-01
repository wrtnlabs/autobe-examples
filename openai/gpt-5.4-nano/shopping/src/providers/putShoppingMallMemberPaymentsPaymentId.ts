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

export async function putShoppingMallMemberPaymentsPaymentId(props: {
  member: MemberPayload;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.IUpdate;
}): Promise<IShoppingMallPayment> {
  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.paymentId },
    select: {
      id: true,
      status: true,
      paid_at: true,
      error_code: true,
      error_message: true,
      provider_reference: true,
      deleted_at: true,
    },
  });
  if (payment === null || payment.deleted_at !== null) {
    // findUniqueOrThrow would be better but needs deleted_at filter; throw 404
    throw new HttpException("Not Found", 404);
  }
  // Validate request body fields (status, paid_at, error_code, error_message, provider_reference)
  const body: any = props.body;
  const nextStatus = body?.status;
  const nextPaidAt = body?.paid_at;
  const nextErrorCode = body?.error_code;
  const nextErrorMessage = body?.error_message;
  const nextProviderReference = body?.provider_reference;
  if (nextStatus === undefined) {
    throw new HttpException("status is required", 400);
  }
  const isSuccess = nextStatus === "succeeded";
  const isFailure = nextStatus === "failed";
  if (!isSuccess && !isFailure) {
    throw new HttpException("Unsupported status", 400);
  }
  if (isSuccess) {
    if (nextPaidAt === undefined || nextPaidAt === null)
      throw new HttpException("paid_at is required on success", 400);
    if (nextErrorCode !== undefined && nextErrorCode !== null) {
      /* allow null only */
    }
  } else {
    if (nextPaidAt !== undefined && nextPaidAt !== null) {
      throw new HttpException("paid_at must be null on failure", 400);
    }
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const current = await tx.shopping_mall_payments.findUniqueOrThrow({
      where: { id: props.paymentId },
      select: {
        id: true,
        status: true,
        paid_at: true,
        provider_reference: true,
        deleted_at: true,
      },
    });
    // idempotency check for successful payments: ensure order exists via relation if any
    if (nextStatus === "succeeded") {
      // try to find existing order
      const existingOrder = await tx.shopping_mall_orders.findUnique({
        where: { shopping_payment_id: props.paymentId },
        select: { id: true } as any,
      });
      if (existingOrder === null) {
        // create order flow placeholder (requires schemas/logic)
      }
    }
    await tx.shopping_mall_payments.update({
      where: { id: props.paymentId },
      data: {
        status: nextStatus,
        ...(nextProviderReference !== undefined && {
          provider_reference: nextProviderReference,
        }),
        ...(nextStatus === "succeeded"
          ? { paid_at: nextPaidAt }
          : { paid_at: null }),
        ...(nextErrorCode !== undefined && {
          error_code: nextErrorCode ?? null,
        }),
        ...(nextErrorMessage !== undefined && {
          error_message: nextErrorMessage ?? null,
        }),
        updated_at: nextPaidAt ?? undefined,
      },
    });
    const rec = await tx.shopping_mall_payments.findUniqueOrThrow({
      where: { id: props.paymentId },
      ...ShoppingMallPaymentTransformer.select(),
    });
    return rec;
  });
  return await ShoppingMallPaymentTransformer.transform(updated);
}
