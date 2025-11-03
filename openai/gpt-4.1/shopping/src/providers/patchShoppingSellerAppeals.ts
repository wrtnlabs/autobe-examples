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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerAppeals(props: {
  seller: SellerPayload;
  body: IShoppingAppeal.IRequest;
}): Promise<IPageIShoppingAppeal.ISummary> {
  const { seller, body } = props;
  const page = typeof body.page === "number" ? Number(body.page) : 1;
  let limit = typeof body.limit === "number" ? Number(body.limit) : 20;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;
  // Only fetch appeals filed by this seller
  const where: Record<string, unknown> = {
    deleted_at: null,
    filed_by_seller_id: seller.id,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.decision !== undefined && { decision: body.decision }),
    ...(body.appeal_of_policy_violation_id !== undefined && {
      appeal_of_policy_violation_id: body.appeal_of_policy_violation_id,
    }),
    ...(body.appeal_of_suspension_id !== undefined && {
      appeal_of_suspension_id: body.appeal_of_suspension_id,
    }),
    ...((body.created_from !== undefined || body.created_to !== undefined) && {
      created_at: {
        ...(body.created_from !== undefined && { gte: body.created_from }),
        ...(body.created_to !== undefined && { lte: body.created_to }),
      },
    }),
    ...((body.decision_from !== undefined ||
      body.decision_to !== undefined) && {
      decision_at: {
        ...(body.decision_from !== undefined && { gte: body.decision_from }),
        ...(body.decision_to !== undefined && { lte: body.decision_to }),
      },
    }),
  };
  if (body.search && body.search.trim().length > 0) {
    where.OR = [
      { reason: { contains: body.search } },
      // decision_reason does not exist as a column; can't search it
    ];
  }
  const allowedSortBy = ["created_at", "status", "decision_at"];
  const sortBy = allowedSortBy.includes(body.sort_by ?? "")
    ? (body.sort_by ?? "created_at")
    : "created_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_appeals.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip,
      take: limit,
      select: {
        id: true,
        status: true,
        reason: true,
        decision: true,
        created_at: true,
        updated_at: true,
        decision_at: true,
        appeal_of_policy_violation_id: true,
        appeal_of_suspension_id: true,
      },
    }),
    MyGlobal.prisma.shopping_appeals.count({ where }),
  ]);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      status: row.status,
      // 'type' is part of API; must be inferred or defaulted (best effort here)
      type: body.type ?? "suspension", // fallback value, or custom logic
      reason: row.reason,
      filer_actor_type: "seller",
      filer_actor_id: seller.id,
      // As the seller is the one that filed, affected actor type/id can't be resolved with this info; return empty string or null
      affected_actor_type: "",
      affected_actor_id: "" as string & tags.Format<"uuid">,
      decision: row.decision ?? null,
      // decision_reason does not exist; return empty string per DTO default
      decision_reason: "",
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      decision_at: row.decision_at ? toISOStringSafe(row.decision_at) : null,
      appeal_of_policy_violation_id: row.appeal_of_policy_violation_id ?? null,
      appeal_of_suspension_id: row.appeal_of_suspension_id ?? null,
    })),
  };
}
