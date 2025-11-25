import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallSupportTickets(props: {
  customer: CustomerPayload;
  body: IShoppingMallSupportTicket.ICreate;
}): Promise<IShoppingMallSupportTicket> {
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_support_tickets.create({
    data: {
      id: v4(),
      title: props.body.title,
      description: props.body.description,
      status: props.body.status,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_seller_id: null,
      shopping_mall_customer_session_id: props.customer.session_id,
      shopping_mall_seller_session_id: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    title: created.title,
    description: created.description,
    status: created.status,
    shopping_mall_customer_id: created.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: null,
    shopping_mall_customer_session_id:
      created.shopping_mall_customer_session_id ?? undefined,
    shopping_mall_seller_session_id: null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
