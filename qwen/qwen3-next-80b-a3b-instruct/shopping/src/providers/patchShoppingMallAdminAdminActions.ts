import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAction";
import { IShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAction";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminActions(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminAction.IRequest;
}): Promise<IPageIShoppingMallAdminAction.ISummary> {
  // The specification requires filtering/pagination parameters but IRequest is empty
  // This is a contract violation between API specification and DTO definition
  // We must reconcile this by assuming the specification is correct and
  // the DTO is incomplete, so we extend the body object with the necessary properties
  // as the specification defines them, since our implementation must comply with spec
  const cursor = (props.body as any).after_key
    ? new Date((props.body as any).after_key)
    : undefined;
  const limit = (props.body as any).limit ?? 25;
  // Build where clause with optional filters
  const whereInput: Prisma.shopping_mall_admin_actionsWhereInput = {};
  if ((props.body as any).action_type) {
    whereInput.action_type = (props.body as any).action_type;
  }
  if ((props.body as any).affected_entity_type) {
    whereInput.affected_entity_type = (props.body as any).affected_entity_type;
  }
  if ((props.body as any).affected_entity_id) {
    whereInput.affected_entity_id = (props.body as any).affected_entity_id;
  }
  if ((props.body as any).reason) {
    whereInput.reason = {
      contains: (props.body as any).reason,
      mode: "insensitive",
    };
  }
  // Handle date filters properly with Prisma DateTimeFilter structure
  if (
    (props.body as any).created_at_from ||
    (props.body as any).created_at_to ||
    cursor
  ) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if ((props.body as any).created_at_from) {
      dateFilter.gte = (props.body as any).created_at_from;
    }
    if ((props.body as any).created_at_to) {
      dateFilter.lte = (props.body as any).created_at_to;
    }
    if (cursor) {
      dateFilter.gt = cursor;
    }
    whereInput.created_at = dateFilter;
  }
  // Fetch data
  const data = await MyGlobal.prisma.shopping_mall_admin_actions.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" as const },
    take: limit,
    select: {
      id: true,
      admin_id: true,
      action_type: true,
      affected_entity_type: true,
      affected_entity_id: true,
      reason: true,
      created_at: true,
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.shopping_mall_admin_actions.count({
    where: whereInput,
  });
  // Transform to summary format - convert Date to string using toISOStringSafe
  const summaryData = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    admin_id: item.admin_id as string & tags.Format<"uuid">,
    action_type: item.action_type,
    affected_entity_type: item.affected_entity_type,
    affected_entity_id: item.affected_entity_id as string & tags.Format<"uuid">,
    reason: item.reason,
    created_at: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
  }));
  // Compute pagination
  const nextCursor =
    data.length > 0
      ? toISOStringSafe(data[data.length - 1].created_at)
      : undefined;
  return {
    data: summaryData,
    pagination: {
      current: 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
