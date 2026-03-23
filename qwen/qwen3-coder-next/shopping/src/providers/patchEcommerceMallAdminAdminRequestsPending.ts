import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
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

export async function patchEcommerceMallAdminAdminRequestsPending(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.ecommerce_mall_admin_requests.findMany({
    where: { status: "pending" },
    skip,
    take: limit,
    orderBy: { id: "desc" },
    select: {
      id: true,
      reason: true,
      status: true,
      responded_at: true,
      user_id: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_admin_requests.count({
    where: { status: "pending" },
  });
  const customers = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
    where: { id: { in: data.map((d) => d.user_id) } },
    select: {
      id: true,
      email: true,
      created_at: true,
    },
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((record) => {
      const customer = customerMap.get(record.user_id);
      if (!customer) {
        throw new HttpException("Customer not found", 404);
      }
      return {
        id: record.id,
        reason: record.reason,
        status: record.status as "pending" | "approved" | "rejected",
        responded_at: record.responded_at?.toISOString() ?? null,
        user: {
          id: customer.id,
          email: customer.email,
          is_suspended: false,
          created_at: customer.created_at.toISOString(),
        } satisfies IEcommerceMallCustomer.ISummary,
      };
    }),
  } satisfies IPageIEcommerceMallAdminRequest.ISummary;
}
