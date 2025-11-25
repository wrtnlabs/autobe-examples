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

export async function putShoppingMallAdminEscalationQueuesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallEscalationQueue.IUpdate;
}): Promise<IShoppingMallEscalationQueue> {
  const existing =
    await MyGlobal.prisma.shopping_mall_escalation_queues.findUnique({
      where: { id: props.id },
    });

  if (!existing) {
    throw new HttpException("Escalation queue not found", 404);
  }

  const updateData = {
    ...(props.body.escalation_type !== undefined && {
      escalation_type: props.body.escalation_type,
    }),
    ...(props.body.reason_detail !== undefined && {
      reason_detail: props.body.reason_detail,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    ...(Object.prototype.hasOwnProperty.call(
      props.body,
      "assigned_admin_id",
    ) && {
      assigned_admin_id:
        props.body.assigned_admin_id === null
          ? null
          : props.body.assigned_admin_id,
    }),
    ...(Object.prototype.hasOwnProperty.call(props.body, "resolved_at") && {
      resolved_at:
        props.body.resolved_at === null ? null : props.body.resolved_at,
    }),
    last_updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.shopping_mall_escalation_queues.update({
    where: { id: props.id },
    data: updateData,
  });

  return {
    id: updated.id,
    escalation_type: updated.escalation_type,
    reason_detail: updated.reason_detail,
    status: updated.status,
    priority: updated.priority,
    initiator_actor_admin_id:
      updated.initiator_actor_admin_id === null
        ? undefined
        : updated.initiator_actor_admin_id,
    initiator_actor_seller_id:
      updated.initiator_actor_seller_id === null
        ? undefined
        : updated.initiator_actor_seller_id,
    initiator_actor_customer_id:
      updated.initiator_actor_customer_id === null
        ? undefined
        : updated.initiator_actor_customer_id,
    assigned_admin_id:
      updated.assigned_admin_id === null
        ? undefined
        : updated.assigned_admin_id,
    created_at: toISOStringSafe(updated.created_at),
    resolved_at: Object.prototype.hasOwnProperty.call(updated, "resolved_at")
      ? updated.resolved_at === null
        ? null
        : toISOStringSafe(updated.resolved_at)
      : undefined,
    last_updated_at: toISOStringSafe(updated.last_updated_at),
  };
}
