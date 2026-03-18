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
  const current = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.paymentId },
    select: {
      id: true,
      status: true,
      paid_at: true,
      error_code: true,
      error_message: true,
      provider_reference: true,
      deleted_at: true,
      orderForPayment: { select: { id: true, deleted_at: true } },
    },
  });
  if (current === null || current.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const bodyAny = props.body as any;
  const status = bodyAny.status as string | undefined;
  const paid_at = bodyAny.paid_at as string | null | undefined;
  const error_code = bodyAny.error_code as string | null | undefined;
  const error_message = bodyAny.error_message as string | null | undefined;
  const provider_reference = bodyAny.provider_reference as string | undefined;
  if (status === undefined) {
    throw new HttpException("Missing status", 400);
  }
  const succeeded = status === "succeeded";
  const failed = status === "failed";
  if (!succeeded && !failed) {
    throw new HttpException("Unsupported status", 400);
  }
  if (succeeded) {
    if (paid_at === null || paid_at === undefined) {
      throw new HttpException("paid_at is required when succeeded", 400);
    }
    if (error_code !== undefined || error_message !== undefined) {
      // allow client-provided but set null by rule
    }
  } else {
    if (paid_at !== null && paid_at !== undefined) {
      throw new HttpException("paid_at must be null when failed", 400);
    }
  }
  if (failed) {
    const hasAnyError =
      (error_code ?? null) !== null || (error_message ?? null) !== null;
    if (!hasAnyError) {
      throw new HttpException(
        "error_code or error_message required when failed",
        400,
      );
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const latest = await tx.shopping_mall_payments.findUnique({
      where: { id: props.paymentId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        paid_at: true,
        error_code: true,
        error_message: true,
        orderForPayment: { select: { id: true } },
      },
    });
    if (latest === null || latest.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    const fromStatus = latest.status;
    if (fromStatus === status) {
      return;
    }
    if (fromStatus === "succeeded" && status === "failed") {
      throw new HttpException("Invalid status transition", 409);
    }
    await tx.shopping_mall_payments.update({
      where: { id: props.paymentId },
      data: {
        status,
        ...(succeeded
          ? (() => {
              // paid_at is guaranteed non-null here
              const paidDate = new Date(paid_at as string);
              // ensure internal conversion is valid
              if (Number.isNaN(paidDate.getTime())) {
                throw new HttpException("Invalid paid_at", 400);
              }
              return { paid_at: paidDate };
            })()
          : { paid_at: null }),
        error_code: failed ? (error_code ?? null) : null,
        error_message: failed ? (error_message ?? null) : null,
        ...(provider_reference !== undefined ? { provider_reference } : {}),
        updated_at: new Date(),
      },
    });
    const orderExists = latest.orderForPayment !== null;
    if (status === "succeeded" && !orderExists) {
      // Trigger should be handled by domain logic / constraints.
    }
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_payments.findUniqueOrThrow({
      where: { id: props.paymentId },
      ...ShoppingMallPaymentTransformer.select(),
    });
  return await ShoppingMallPaymentTransformer.transform(updated);
}
