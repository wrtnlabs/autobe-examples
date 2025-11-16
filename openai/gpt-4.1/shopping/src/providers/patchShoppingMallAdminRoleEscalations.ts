import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRoleEscalation";
import { IPageIShoppingMallRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRoleEscalation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminRoleEscalations(props: {
  admin: AdminPayload;
  body: IShoppingMallRoleEscalation.IRequest;
}): Promise<IPageIShoppingMallRoleEscalation.ISummary> {
  const body = props.body;

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderByField = body.order_by ?? "created_at";
  const orderDir = body.order_dir ?? "desc";

  // Build the Prisma 'where' conditions based on provided filters
  const where = {
    ...(body.status !== undefined && { status: body.status }),
    ...(body.target_role !== undefined && { target_role: body.target_role }),
    ...(body.requestor_actor_id !== undefined && {
      requestor_actor_id: body.requestor_actor_id,
    }),
    ...(body.requestor_seller_id !== undefined && {
      requestor_seller_id: body.requestor_seller_id,
    }),
    ...(body.processed_by_admin_id !== undefined && {
      processed_by_admin_id: body.processed_by_admin_id,
    }),
    // Date ranges
    ...(body.created_from !== undefined &&
      body.created_to !== undefined && {
        created_at: {
          gte: body.created_from,
          lte: body.created_to,
        },
      }),
    ...(body.created_from !== undefined &&
      body.created_to === undefined && {
        created_at: {
          gte: body.created_from,
        },
      }),
    ...(body.created_from === undefined &&
      body.created_to !== undefined && {
        created_at: {
          lte: body.created_to,
        },
      }),
    ...(body.processed_from !== undefined &&
      body.processed_to !== undefined && {
        processed_at: {
          gte: body.processed_from,
          lte: body.processed_to,
        },
      }),
    ...(body.processed_from !== undefined &&
      body.processed_to === undefined && {
        processed_at: {
          gte: body.processed_from,
        },
      }),
    ...(body.processed_from === undefined &&
      body.processed_to !== undefined && {
        processed_at: {
          lte: body.processed_to,
        },
      }),
  };

  const [entries, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_role_escalations.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [orderByField]: orderDir,
      },
    }),
    MyGlobal.prisma.shopping_mall_role_escalations.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: entries.map((entity) => ({
      id: entity.id,
      target_role: entity.target_role,
      status: entity.status,
      reason: entity.reason ?? undefined,
      created_at: toISOStringSafe(entity.created_at),
      processed_at:
        entity.processed_at !== undefined && entity.processed_at !== null
          ? toISOStringSafe(entity.processed_at)
          : undefined,
    })),
  };
}
