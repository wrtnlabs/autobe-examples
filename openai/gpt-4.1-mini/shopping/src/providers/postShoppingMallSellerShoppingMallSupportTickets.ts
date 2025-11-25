import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerShoppingMallSupportTickets(props: {
  seller: SellerPayload;
  body: IShoppingMallSupportTicket.ICreate;
}): Promise<IShoppingMallSupportTicket> {
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_support_tickets.create({
    data: {
      id,
      title: props.body.title,
      description: props.body.description,
      status: props.body.status,
      shopping_mall_seller_id: props.seller.id,
      shopping_mall_seller_session_id: props.seller.session_id,
      shopping_mall_customer_id: null,
      shopping_mall_customer_session_id: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id,
    title: created.title,
    description: created.description,
    status: created.status,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_seller_id: created.shopping_mall_seller_id,
    shopping_mall_customer_session_id:
      created.shopping_mall_customer_session_id,
    shopping_mall_seller_session_id: created.shopping_mall_seller_session_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
