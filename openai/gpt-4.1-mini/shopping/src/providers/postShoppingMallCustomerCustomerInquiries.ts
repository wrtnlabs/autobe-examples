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

export async function postShoppingMallCustomerCustomerInquiries(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerInquiry.ICreate;
}): Promise<IShoppingMallCustomerInquiry> {
  const now = toISOStringSafe(new Date()) satisfies string &
    tags.Format<"date-time">;

  const status = (props.body.status ?? "open") satisfies
    | "pending"
    | "open"
    | "resolved"
    | "closed";

  const created = await MyGlobal.prisma.shopping_mall_customer_inquiries.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        customer: { connect: { id: props.customer.id } },
        title: props.body.title,
        body: props.body.body,
        status,
        created_at: now,
        updated_at: now,
      },
    },
  );

  return {
    id: created.id,
    customer_id: created.shopping_mall_customer_id,
    session_id: created.shopping_mall_customer_session_id ?? null,
    title: created.title,
    body: created.body,
    status: typia.assert<"pending" | "open" | "resolved" | "closed">(
      created.status,
    ),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
