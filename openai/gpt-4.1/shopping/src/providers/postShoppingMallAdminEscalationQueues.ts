import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEscalationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalationQueue";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminEscalationQueues(props: {
  admin: AdminPayload;
  body: IShoppingMallEscalationQueue.ICreate;
}): Promise<IShoppingMallEscalationQueue> {
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_escalation_queues.create({
    data: {
      id: v4(),
      escalation_type: props.body.escalation_type,
      reason_detail: props.body.reason_detail,
      status: props.body.status,
      priority: props.body.priority,
      initiator_actor_admin_id:
        props.body.initiator_actor_admin_id ?? props.admin.id,
      initiator_actor_seller_id: props.body.initiator_actor_seller_id ?? null,
      initiator_actor_customer_id:
        props.body.initiator_actor_customer_id ?? null,
      assigned_admin_id: null,
      created_at: now,
      resolved_at: null,
      last_updated_at: now,
    },
  });

  return {
    id: created.id,
    escalation_type: created.escalation_type,
    reason_detail: created.reason_detail,
    status: created.status,
    priority: created.priority,
    initiator_actor_admin_id: created.initiator_actor_admin_id ?? undefined,
    initiator_actor_seller_id: created.initiator_actor_seller_id ?? undefined,
    initiator_actor_customer_id:
      created.initiator_actor_customer_id ?? undefined,
    assigned_admin_id: created.assigned_admin_id ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    resolved_at: created.resolved_at
      ? toISOStringSafe(created.resolved_at)
      : null,
    last_updated_at: toISOStringSafe(created.last_updated_at),
  };
}
