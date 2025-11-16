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

export async function postShoppingMallAdminPayments(props: {
  admin: AdminPayload;
  body: IShoppingMallPayment.ICreate;
}): Promise<IShoppingMallPayment> {
  // 1. Uniqueness checks for transaction_token and external_payment_id
  const [existingToken, existingExternalId] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payments.findUnique({
      where: {
        transaction_token: props.body.transaction_token,
      },
    }),
    MyGlobal.prisma.shopping_mall_payments.findUnique({
      where: {
        external_payment_id: props.body.external_payment_id,
      },
    }),
  ]);
  if (existingToken !== null) {
    throw new HttpException(
      "Duplicate transaction_token. This payment has already been processed or submitted.",
      409,
    );
  }
  if (existingExternalId !== null) {
    throw new HttpException(
      "Duplicate external_payment_id. This payment has already been processed or submitted.",
      409,
    );
  }

  // 2. Validate referenced customer
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: {
      id: props.body.customer_id,
    },
  });
  if (customer === null) {
    throw new HttpException("Referenced customer does not exist.", 404);
  }

  // 3. Validate referenced provider
  const provider =
    await MyGlobal.prisma.shopping_mall_external_payment_providers.findUnique({
      where: {
        id: props.body.provider_id,
        deleted_at: null,
      },
    });
  if (provider === null) {
    throw new HttpException(
      "Referenced external payment provider does not exist or is deleted.",
      404,
    );
  }

  // 4. Create new payment record
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_payments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      customer_id: props.body.customer_id,
      provider_id: props.body.provider_id,
      amount: props.body.amount,
      currency: props.body.currency,
      method_type: props.body.method_type,
      status: props.body.status,
      external_payment_id: props.body.external_payment_id,
      transaction_token: props.body.transaction_token,
      requested_at: props.body.requested_at,
      processed_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    include: {
      customer: true,
      provider: true,
    },
  });

  // 5. Map DB record to API response type
  return {
    id: created.id,
    customer: {
      id: created.customer.id,
      name: created.customer.name,
    },
    provider: {
      id: created.provider.id,
      name: created.provider.provider_name,
      provider_code: created.provider.provider_code,
      status: created.provider.status,
      description: created.provider.description,
      created_at: toISOStringSafe(created.provider.created_at),
      updated_at: toISOStringSafe(created.provider.updated_at),
      deleted_at: created.provider.deleted_at
        ? toISOStringSafe(created.provider.deleted_at)
        : undefined,
    },
    amount: created.amount,
    currency: created.currency,
    method_type: created.method_type,
    status: created.status,
    external_payment_id: created.external_payment_id,
    transaction_token: created.transaction_token,
    requested_at: toISOStringSafe(created.requested_at),
    processed_at: created.processed_at
      ? toISOStringSafe(created.processed_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
