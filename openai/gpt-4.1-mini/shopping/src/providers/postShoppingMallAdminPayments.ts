import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminPayments(props: {
  admin: AdminPayload;
  body: IShoppingMallPayment.ICreate;
}): Promise<IShoppingMallPayment> {
  try {
    const now = toISOStringSafe(new Date());
    const created = await MyGlobal.prisma.shopping_mall_payments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_order_id: props.body.shopping_mall_order_id,
        payment_method: props.body.payment_method,
        payment_status: props.body.payment_status,
        payment_amount: props.body.payment_amount,
        transaction_id: props.body.transaction_id,
        payment_date: props.body.payment_date,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: created.id,
      shopping_mall_order_id: created.shopping_mall_order_id,
      payment_method: created.payment_method,
      payment_status: created.payment_status,
      payment_amount: created.payment_amount,
      transaction_id: created.transaction_id,
      payment_date: toISOStringSafe(created.payment_date),
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === "P2002" &&
        error.meta &&
        Array.isArray(error.meta.target) &&
        error.meta.target.includes("transaction_id")
      ) {
        throw new HttpException("Duplicate transaction_id", 400);
      }
    }
    throw error;
  }
}
