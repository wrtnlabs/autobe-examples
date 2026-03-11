import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemNotificationAtSummaryTransformer } from "../transformers/DiscussionBoardSystemNotificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminNotificationsDelivery(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSystemNotification.IRequest;
}): Promise<IPageIDiscussionBoardSystemNotification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate limit within allowed range
  const validatedLimit = Math.max(1, Math.min(limit, 100));
  // Build WHERE condition with all applicable filters
  const whereInput = {
    // No soft delete filter needed for system_notifications table
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { content: { contains: props.body.search } },
      ],
    }),
    ...(props.body.notification_type && {
      notification_type: props.body.notification_type,
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.priority && { priority: props.body.priority }),
    ...(props.body.target_entity_type && {
      target_entity_type: props.body.target_entity_type,
    }),
    ...(props.body.target_entity_id && {
      target_entity_id: props.body.target_entity_id,
    }),
  } satisfies Prisma.discussion_board_system_notificationsWhereInput;
  // Default ordering by creation date descending
  const orderByInput = {
    created_at: "desc" as const,
  } satisfies Prisma.discussion_board_system_notificationsOrderByWithRelationInput;
  // Execute paginated query and count in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_notifications.findMany({
      where: whereInput,
      skip,
      take: validatedLimit,
      orderBy: orderByInput,
      ...DiscussionBoardSystemNotificationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_system_notifications.count({
      where: whereInput,
    }),
  ]);
  // Transform database results to DTO format
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSystemNotificationAtSummaryTransformer.transform,
  );
  // Calculate total pages (handle zero total case)
  const pages = validatedLimit > 0 ? Math.ceil(total / validatedLimit) : 0;
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: validatedLimit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
