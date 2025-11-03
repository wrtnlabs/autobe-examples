import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPolicyViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPolicyViolation";
import { IPageIShoppingPolicyViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingPolicyViolation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessPolicy";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminPolicyViolations(props: {
  admin: AdminPayload;
  body: IShoppingPolicyViolation.IRequest;
}): Promise<IPageIShoppingPolicyViolation.ISummary> {
  const { body } = props;

  // Pagination defaults and safety (page is 1-based, limit capped at 100)
  const page = body.page && Number(body.page) > 0 ? Number(body.page) : 1;
  const limit =
    body.limit && Number(body.limit) > 0
      ? Math.min(Number(body.limit), 100)
      : 20;
  const skip = (page - 1) * limit;

  // Acceptable sort fields
  const allowedSortFields = ["created_at", "updated_at", "status"];
  const sort_by =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // Filter mapping
  const where = {
    ...(body.violation_code !== undefined && {
      violation_code: body.violation_code,
    }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.actor_type !== undefined && {
      violation_type: body.actor_type,
    }),
    ...(body.affected_entity_type !== undefined &&
      body.affected_entity_id !== undefined && {
        ...(body.affected_entity_type === "admin"
          ? { affected_admin_id: body.affected_entity_id }
          : {}),
        ...(body.affected_entity_type === "seller"
          ? { affected_seller_id: body.affected_entity_id }
          : {}),
        ...(body.affected_entity_type === "customer"
          ? { affected_customer_id: body.affected_entity_id }
          : {}),
        ...(body.affected_entity_type === "product"
          ? { affected_product_id: body.affected_entity_id }
          : {}),
        ...(body.affected_entity_type === "order"
          ? { affected_order_id: body.affected_entity_id }
          : {}),
      }),
    ...(body.policy_name !== undefined && {
      policy: {
        policy_name: body.policy_name,
      },
    }),
    ...(body.date_from !== undefined || body.date_to !== undefined
      ? {
          created_at: {
            ...(body.date_from !== undefined && { gte: body.date_from }),
            ...(body.date_to !== undefined && { lte: body.date_to }),
          },
        }
      : {}),
    ...(body.actor_id !== undefined &&
      body.actor_type !== undefined && {
        ...(body.actor_type === "admin"
          ? { reported_by_admin_id: body.actor_id }
          : {}),
        ...(body.actor_type === "seller"
          ? { reported_by_seller_id: body.actor_id }
          : {}),
        ...(body.actor_type === "customer"
          ? { reported_by_customer_id: body.actor_id }
          : {}),
      }),
  };

  // Total and result fetch
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_policy_violations.count({
      where,
    }),
    MyGlobal.prisma.shopping_policy_violations.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: limit,
      include: {
        policy: true,
      },
    }),
  ]);

  // Result assembly
  const data = rows.map((row) => ({
    id: row.id,
    policy_id: row.policy_id,
    violation_type: row.violation_type,
    violation_code: row.violation_code,
    status: row.status,
    decision: row.decision ?? undefined,
    description: row.description ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    decision_at: row.decision_at ? toISOStringSafe(row.decision_at) : undefined,
    policy: {
      id: row.policy.id,
      policy_name: row.policy.policy_name,
      scope: row.policy.scope,
      value: row.policy.value,
      description: row.policy.description,
      active: row.policy.active,
      created_at: toISOStringSafe(row.policy.created_at),
      updated_at: toISOStringSafe(row.policy.updated_at),
    },
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
