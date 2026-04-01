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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberPayments(props: {
  member: MemberPayload;
  body: IShoppingMallPayment.IRequest;
}): Promise<IShoppingMallPayment> {
  const provider_reference = props.body.provider_reference;
  const payment = await MyGlobal.prisma.shopping_mall_payments.findFirstOrThrow(
    {
      where: {
        provider_reference: provider_reference,
        deleted_at: null,
        orderForPayment: {
          is: {
            deleted_at: null,
            shopping_customer_id: props.member.id,
          },
        },
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        provider: true,
        provider_reference: true,
        status: true,
        paid_at: true,
        error_code: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderForPayment: {
          select: {
            id: true,
            order_code: true,
            ship_to_name: true,
            ship_to_phone: true,
            ship_to_postal_code: true,
            ship_to_region: true,
            ship_to_city: true,
            ship_to_street_address: true,
            ship_to_detail_address: true,
            shipping_instructions: true,
            placed_at: true,
            deleted_at: true,
          },
        },
      },
    },
  );
  const isSuccess = props.body.status === "succeeded";
  const isFailed = props.body.status === "failed";
  if (!isSuccess && !isFailed) {
    throw new HttpException("Unsupported payment status", 400);
  }
  if (isSuccess && props.body.paid_at === null) {
    throw new HttpException("paid_at must be provided on success", 400);
  }
  if (isFailed && props.body.paid_at !== null) {
    throw new HttpException("paid_at must be null on failure", 400);
  }
  if (payment.provider !== props.body.provider) {
    throw new HttpException("Provider mismatch", 400);
  }
  const currentStatus = payment.status;
  if (currentStatus === "succeeded" && isFailed) {
    throw new HttpException("Payment already succeeded", 409);
  }
  if (currentStatus === "failed" && isSuccess) {
    throw new HttpException("Payment already failed", 409);
  }
  const updatedPaymentAndOrder = await MyGlobal.prisma.$transaction(
    async (tx) => {
      const updated = await tx.shopping_mall_payments.update({
        where: { id: payment.id },
        data: {
          status: props.body.status,
          paid_at: isSuccess
            ? new Date(props.body.paid_at as unknown as string)
            : null,
          error_code: isSuccess ? null : props.body.error_code,
          error_message: isSuccess ? null : props.body.error_message,
          updated_at: new Date(),
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          provider: true,
          provider_reference: true,
          status: true,
          paid_at: true,
          error_code: true,
          error_message: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          orderForPayment: {
            select: {
              id: true,
              order_code: true,
              ship_to_name: true,
              ship_to_phone: true,
              ship_to_postal_code: true,
              ship_to_region: true,
              ship_to_city: true,
              ship_to_street_address: true,
              ship_to_detail_address: true,
              shipping_instructions: true,
              placed_at: true,
              deleted_at: true,
            },
          },
        },
      });
      if (isSuccess) {
        // Order must be created only once per payment. If it already exists, do nothing.
        if (
          updated.orderForPayment === null ||
          updated.orderForPayment === undefined
        ) {
          // We cannot create required order address fields because the operation does not receive checkout snapshot inputs.
          throw new HttpException(
            "Order context missing for successful payment",
            400,
          );
        }
      }
      return updated;
    },
  );
  return {
    id: updatedPaymentAndOrder.id,
    amount: updatedPaymentAndOrder.amount,
    currency: updatedPaymentAndOrder.currency,
    provider: updatedPaymentAndOrder.provider,
    provider_reference: updatedPaymentAndOrder.provider_reference,
    status: updatedPaymentAndOrder.status,
    paid_at: updatedPaymentAndOrder.paid_at
      ? updatedPaymentAndOrder.paid_at.toISOString()
      : null,
    error_code: updatedPaymentAndOrder.error_code ?? null,
    error_message: updatedPaymentAndOrder.error_message ?? null,
    created_at: updatedPaymentAndOrder.created_at.toISOString(),
    updated_at: updatedPaymentAndOrder.updated_at.toISOString(),
    deleted_at: updatedPaymentAndOrder.deleted_at
      ? updatedPaymentAndOrder.deleted_at.toISOString()
      : null,
  };
}
