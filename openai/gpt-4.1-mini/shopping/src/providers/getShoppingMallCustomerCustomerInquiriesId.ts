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

export async function getShoppingMallCustomerCustomerInquiriesId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerInquiry> {
  const found =
    await MyGlobal.prisma.shopping_mall_customer_inquiries.findUnique({
      where: { id: props.id },
    });

  if (!found || found.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Customer inquiry not found", 404);
  }

  return {
    id: found.id,
    customer_id: found.shopping_mall_customer_id,
    session_id: found.shopping_mall_customer_session_id ?? null,
    title: found.title,
    body: found.body,
    status: typia.assert<"pending" | "open" | "resolved" | "closed">(
      found.status,
    ),
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
  };
}
