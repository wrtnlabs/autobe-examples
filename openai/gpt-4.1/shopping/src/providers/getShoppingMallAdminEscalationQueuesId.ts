import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEscalationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalationQueue";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminEscalationQueuesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallEscalationQueue> {
  const escalation =
    await MyGlobal.prisma.shopping_mall_escalation_queues.findUnique({
      where: { id: props.id },
    });

  if (!escalation) {
    throw new HttpException("Escalation record not found", 404);
  }

  return {
    id: escalation.id,
    escalation_type: escalation.escalation_type,
    reason_detail: escalation.reason_detail,
    status: escalation.status,
    priority: escalation.priority,
    initiator_actor_admin_id:
      escalation.initiator_actor_admin_id === null
        ? undefined
        : escalation.initiator_actor_admin_id,
    initiator_actor_seller_id:
      escalation.initiator_actor_seller_id === null
        ? undefined
        : escalation.initiator_actor_seller_id,
    initiator_actor_customer_id:
      escalation.initiator_actor_customer_id === null
        ? undefined
        : escalation.initiator_actor_customer_id,
    assigned_admin_id:
      escalation.assigned_admin_id === null
        ? undefined
        : escalation.assigned_admin_id,
    created_at: toISOStringSafe(escalation.created_at),
    resolved_at: escalation.resolved_at
      ? toISOStringSafe(escalation.resolved_at)
      : null,
    last_updated_at: toISOStringSafe(escalation.last_updated_at),
  };
}
