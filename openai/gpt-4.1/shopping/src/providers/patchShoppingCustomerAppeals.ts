import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAppeal";
import { IPageIShoppingAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAppeal";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerAppeals(props: {
  customer: CustomerPayload;
  body: IShoppingAppeal.IRequest;
}): Promise<IPageIShoppingAppeal.ISummary> {
  const { customer, body } = props;
  const page = body.page ?? 1;
  let limit = body.limit ?? 20;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;

  const ALLOWED_SORT_FIELDS = ["created_at", "status", "decision_at"];
  const sortField =
    body.sort_by && ALLOWED_SORT_FIELDS.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  const where: Record<string, any> = {
    filer_actor_type: "customer",
    filer_actor_id: customer.id,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.type !== undefined && { type: body.type }),
    ...(body.decision !== undefined && { decision: body.decision }),
    ...(body.filer_actor_type !== undefined && {
      filer_actor_type: body.filer_actor_type,
    }),
    ...(body.filer_actor_id !== undefined &&
      body.filer_actor_id !== null && { filer_actor_id: body.filer_actor_id }),
    ...(body.affected_actor_type !== undefined && {
      affected_actor_type: body.affected_actor_type,
    }),
    ...(body.affected_actor_id !== undefined &&
      body.affected_actor_id !== null && {
        affected_actor_id: body.affected_actor_id,
      }),
    ...(body.appeal_of_policy_violation_id !== undefined &&
      body.appeal_of_policy_violation_id !== null && {
        appeal_of_policy_violation_id: body.appeal_of_policy_violation_id,
      }),
    ...(body.appeal_of_suspension_id !== undefined &&
      body.appeal_of_suspension_id !== null && {
        appeal_of_suspension_id: body.appeal_of_suspension_id,
      }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
    ...(body.decision_from !== undefined || body.decision_to !== undefined
      ? {
          decision_at: {
            ...(body.decision_from !== undefined && {
              gte: body.decision_from,
            }),
            ...(body.decision_to !== undefined && { lte: body.decision_to }),
          },
        }
      : {}),
    ...(body.search !== undefined &&
      body.search.trim() !== "" && {
        OR: [
          { reason: { contains: body.search } },
          { decision: { contains: body.search } },
        ],
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_appeals.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_appeals.count({
      where,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    status: row.status,
    type: "", // Not present in schema, so empty string
    reason: row.reason,
    filer_actor_type: "customer", // filtered for the customer
    filer_actor_id: customer.id,
    affected_actor_type: "", // no schema support, set to empty string
    affected_actor_id: "", // no schema support, set to empty string
    decision: row.decision ?? null,
    decision_reason: "", // no schema support, set to empty string
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    decision_at:
      row.decision_at === null || row.decision_at === undefined
        ? null
        : toISOStringSafe(row.decision_at),
    appeal_of_policy_violation_id: row.appeal_of_policy_violation_id ?? null,
    appeal_of_suspension_id: row.appeal_of_suspension_id ?? null,
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
