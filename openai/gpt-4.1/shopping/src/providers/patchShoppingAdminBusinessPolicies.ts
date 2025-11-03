import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessPolicy";
import { IPageIShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingBusinessPolicy";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminBusinessPolicies(props: {
  admin: AdminPayload;
  body: IShoppingBusinessPolicy.IRequest;
}): Promise<IPageIShoppingBusinessPolicy.ISummary> {
  const body = props.body ?? {};
  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  // Build where condition
  const where = {
    ...(body.policy_name && { policy_name: { contains: body.policy_name } }),
    ...(body.scope && { scope: { contains: body.scope } }),
    ...(body.status === "active" && { active: true }),
    ...(body.status === "inactive" && { active: false }),
    ...(body.q && {
      OR: [
        { policy_name: { contains: body.q } },
        { scope: { contains: body.q } },
        { value: { contains: body.q } },
        { description: { contains: body.q } },
      ],
    }),
    deleted_at: null,
  };

  // Order-by field
  let orderBy: { [key: string]: "asc" | "desc" };
  if (body.order_by && body.order_direction) {
    orderBy = { [body.order_by]: body.order_direction };
  } else {
    orderBy = { created_at: "desc" };
  }

  // Query rows and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_business_policies.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_business_policies.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      policy_name: row.policy_name,
      scope: row.scope,
      value: row.value,
      description: row.description,
      active: row.active,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
