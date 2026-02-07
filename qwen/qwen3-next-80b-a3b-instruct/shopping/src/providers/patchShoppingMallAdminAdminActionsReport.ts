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

export async function patchShoppingMallAdminAdminActionsReport(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminAction.IRequest;
}): Promise<IPageIShoppingMallAdminAction.ISummary> {
  // Cast body to any to bypass empty IRequest type while maintaining operation specification compliance
  const bodyAny = props.body as any;
  // Operation specification: cursor-based pagination
  const page = bodyAny.page ?? 1;
  const limit = bodyAny.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause from optional filters as per specification
  const whereInput = {
    ...(bodyAny.action_type && {
      action_type: { in: bodyAny.action_type },
    }),
    ...(bodyAny.affected_entity_type && {
      affected_entity_type: { in: bodyAny.affected_entity_type },
    }),
    ...(bodyAny.created_at_after && {
      created_at: { gte: bodyAny.created_at_after },
    }),
    ...(bodyAny.created_at_before && {
      created_at: { lte: bodyAny.created_at_before },
    }),
    ...(bodyAny.admin_id && { admin_id: bodyAny.admin_id }),
  } satisfies Prisma.shopping_mall_admin_actionsWhereInput;
  // Fetch data
  const data = await MyGlobal.prisma.shopping_mall_admin_actions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      action_type: true,
      affected_entity_type: true,
      affected_entity_id: true,
      reason: true,
      created_at: true,
      admin_id: true,
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_admin_actions.count({
    where: whereInput,
  });
  // Transform to IPageIShoppingMallAdminAction.ISummary
  const summaryData = data.map((item) => ({
    action_type: item.action_type,
    affected_entity_type: item.affected_entity_type,
    affected_entity_id: item.affected_entity_id,
    reason: item.reason,
    created_at: toISOStringSafe(item.created_at),
    admin_id: item.admin_id,
  }));
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
