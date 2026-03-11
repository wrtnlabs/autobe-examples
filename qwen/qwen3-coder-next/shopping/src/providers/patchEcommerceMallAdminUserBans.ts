import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
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

export async function patchEcommerceMallAdminUserBans(props: {
  admin: AdminPayload;
  body: IEcommerceMallUserBan.IRequest;
}): Promise<IPageIEcommerceMallUserBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.active !== undefined && {
      is_active: props.body.active === "true",
    }),
    ...(props.body.banned_at_start !== undefined && {
      banned_at: { gte: new Date(props.body.banned_at_start) },
    }),
    ...(props.body.banned_at_end !== undefined && {
      banned_at: { lte: new Date(props.body.banned_at_end) },
    }),
    ...(props.body.reason !== undefined && {
      reason: { contains: props.body.reason },
    }),
  } satisfies Prisma.ecommerce_mall_user_bansWhereInput;
  const orderByInput = {
    banned_at: "desc" as const,
  } satisfies Prisma.ecommerce_mall_user_bansOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_user_bans.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      user_id: true,
      user_type: true,
      admin_id: true,
      banned_at: true,
      unban_at: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_user_bans.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      user_id: record.user_id as string & tags.Format<"uuid">,
      user_email: record.user_id as string & tags.Format<"email">,
      user_type: record.user_type as "customer" | "seller",
      admin_id: record.admin_id as string & tags.Format<"uuid">,
      admin_email: record.admin_id as string & tags.Format<"email">,
      banned_at: toISOStringSafe(record.banned_at),
      unban_at: record.unban_at ? toISOStringSafe(record.unban_at) : null,
      is_active: record.is_active,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallUserBan.ISummary;
}
