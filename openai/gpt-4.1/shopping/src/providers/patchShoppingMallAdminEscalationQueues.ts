import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEscalationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalationQueue";
import { IPageIShoppingMallEscalationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallEscalationQueue";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminEscalationQueues(props: {
  admin: AdminPayload;
  body: IShoppingMallEscalationQueue.IRequest;
}): Promise<IPageIShoppingMallEscalationQueue.ISummary> {
  const {
    status,
    priority,
    escalation_type,
    assigned_admin_id,
    initiator_actor_admin_id,
    initiator_actor_seller_id,
    initiator_actor_customer_id,
    created_from,
    created_to,
    page = 1,
    limit = 25,
    sort_by,
    sort_direction,
  } = props.body;

  // Calculate skip/take for pagination
  const take = limit;
  const skip = (page - 1) * limit;

  // Build filter conditions
  const where: Record<string, any> = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (escalation_type) where.escalation_type = escalation_type;
  if (assigned_admin_id) where.assigned_admin_id = assigned_admin_id;
  if (initiator_actor_admin_id)
    where.initiator_actor_admin_id = initiator_actor_admin_id;
  if (initiator_actor_seller_id)
    where.initiator_actor_seller_id = initiator_actor_seller_id;
  if (initiator_actor_customer_id)
    where.initiator_actor_customer_id = initiator_actor_customer_id;
  if (created_from || created_to) {
    where.created_at = {};
    if (created_from) where.created_at.gte = created_from;
    if (created_to) where.created_at.lte = created_to;
  }

  // Sorting options
  const orderBy: any = {};
  if (sort_by) {
    orderBy[sort_by] = sort_direction || "desc";
  } else {
    orderBy.created_at = "desc";
  }

  // Query: get paginated, filtered events and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_escalation_queues.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        assignedAdmin: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_escalation_queues.count({
      where,
    }),
  ]);

  // Map Prisma results to ISummary
  const data = rows.map((row) => ({
    id: row.id,
    escalation_type: row.escalation_type,
    reason_detail: row.reason_detail,
    status: row.status,
    priority: row.priority,
    assigned_admin: row.assignedAdmin
      ? {
          id: row.assignedAdmin.id,
          name: row.assignedAdmin.name,
          email: row.assignedAdmin.email,
        }
      : null,
    created_at: toISOStringSafe(row.created_at),
    resolved_at: row.resolved_at ? toISOStringSafe(row.resolved_at) : null,
    last_updated_at: toISOStringSafe(row.last_updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
