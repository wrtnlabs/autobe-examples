import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDisputeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeHistory";
import { IPageIShoppingMallDisputeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDisputeHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminDisputesDisputeIdHistories(props: {
  admin: AdminPayload;
  disputeId: string & tags.Format<"uuid">;
  body: IShoppingMallDisputeHistory.IRequest;
}): Promise<IPageIShoppingMallDisputeHistory> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  const where: any = {
    shopping_mall_dispute_id: props.disputeId,
  };
  if (props.body.status !== undefined && props.body.status !== null) {
    where.status = props.body.status;
  }
  if (
    props.body.actor_admin_id !== undefined &&
    props.body.actor_admin_id !== null
  ) {
    where.shopping_mall_actor_admin_id = props.body.actor_admin_id;
  }
  if (
    props.body.actor_customer_id !== undefined &&
    props.body.actor_customer_id !== null
  ) {
    where.shopping_mall_actor_customer_id = props.body.actor_customer_id;
  }
  if (
    props.body.actor_seller_id !== undefined &&
    props.body.actor_seller_id !== null
  ) {
    where.shopping_mall_actor_seller_id = props.body.actor_seller_id;
  }

  const [total, histories] = await Promise.all([
    MyGlobal.prisma.shopping_mall_dispute_histories.count({ where }),
    MyGlobal.prisma.shopping_mall_dispute_histories.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    data: histories.map((h) => ({
      id: h.id,
      shopping_mall_dispute_id: h.shopping_mall_dispute_id,
      status: h.status,
      note: h.note ?? null,
      shopping_mall_actor_admin_id: h.shopping_mall_actor_admin_id ?? null,
      shopping_mall_actor_customer_id:
        h.shopping_mall_actor_customer_id ?? null,
      shopping_mall_actor_seller_id: h.shopping_mall_actor_seller_id ?? null,
      created_at: toISOStringSafe(h.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
