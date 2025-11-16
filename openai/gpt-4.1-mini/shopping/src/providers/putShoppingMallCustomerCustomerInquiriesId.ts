import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerInquiry";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerCustomerInquiriesId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerInquiry.IUpdate;
}): Promise<IShoppingMallCustomerInquiry> {
  const existing =
    await MyGlobal.prisma.shopping_mall_customer_inquiries.findUnique({
      where: { id: props.id },
    });

  if (existing === null) {
    throw new HttpException("Customer inquiry not found", 404);
  }

  if (existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_customer_inquiries.update(
    {
      where: { id: props.id },
      data: {
        title: props.body.title,
        body: props.body.body ?? undefined,
        status: props.body.status,
        updated_at: now,
      },
    },
  );

  return {
    id: updated.id,
    customer_id: updated.shopping_mall_customer_id,
    title: updated.title,
    body: updated.body ?? null,
    status: updated.status as "pending" | "open" | "resolved" | "closed",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
