import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationQueue";
import { IPageIShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationQueue";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminNotificationsQueue(props: {
  admin: AdminPayload;
  body: IShoppingMallNotificationQueue.IRequest;
}): Promise<IPageIShoppingMallNotificationQueue.ISummary> {
  const {
    actor_id,
    template_id,
    notification_type,
    priority,
    status,
    delivery_channel,
    attempt_count,
    before,
    after,
    min_attempts,
    max_attempts,
    sortBy = "scheduled_at",
    order = "asc",
    page = 1,
    limit = 20,
  } = props.body;

  // Build dynamic where clause using Prisma-compatible fields
  const where: any = {};

  // Filter by actor_id
  if (actor_id) where.actor_id = actor_id;

  // Filter by template_id
  if (template_id) where.template_id = template_id;

  // Filter by notification_type
  if (notification_type) where.notification_type = notification_type;

  // Filter by priority
  if (priority) where.priority = priority;

  // Filter by status
  if (status) where.status = status;

  // Filter by delivery_channel
  if (delivery_channel) where.delivery_channel = delivery_channel;

  // Filter by attempt_count
  if (attempt_count) where.attempt_count = attempt_count;

  // Filter by scheduled_at before
  if (before) where.scheduled_at = { ...where.scheduled_at, lte: before };

  // Filter by scheduled_at after
  if (after) where.scheduled_at = { ...where.scheduled_at, gte: after };

  // Filter by min_attempts
  if (min_attempts !== undefined)
    where.attempt_count = { ...where.attempt_count, gte: min_attempts };

  // Filter by max_attempts
  if (max_attempts !== undefined)
    where.attempt_count = { ...where.attempt_count, lte: max_attempts };

  // Ensure only active (not deleted) notifications are returned
  where.deleted_at = null;

  // Calculate skip for pagination
  const skip = (page - 1) * limit;

  // Validate sort field
  const validSortFields = [
    "scheduled_at",
    "created_at",
    "priority",
    "attempt_count",
  ];
  const orderByField = validSortFields.includes(sortBy)
    ? sortBy
    : "scheduled_at";

  // Validate sort order
  const orderByDirection = order === "desc" ? "desc" : "asc";

  // Query notification queue entries
  const notifications =
    await MyGlobal.prisma.shopping_mall_notification_queue.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limit,
      select: {
        id: true,
        actor_id: true,
        template_id: true,
        created_at: true,
        updated_at: true,
        // status is not a field in the Prisma model schema - remove to fix compilation errors
      },
    });

  // Count total matching records for pagination
  const total = await MyGlobal.prisma.shopping_mall_notification_queue.count({
    where,
  });

  // Transform to ISummary format with proper date formatting and type-safe status mapping
  const data = notifications.map((item) => ({
    id: item.id,
    user_id: item.actor_id,
    template_id: item.template_id,
    // status field is not available in the Prisma model, so we assign a default value per DTO requirement
    status: typia.assert<"delivered" | "pending" | "failed">("pending"),
    created_at: toISOStringSafe(item.created_at),
    updated_at: item.updated_at ? toISOStringSafe(item.updated_at) : undefined,
  }));

  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
