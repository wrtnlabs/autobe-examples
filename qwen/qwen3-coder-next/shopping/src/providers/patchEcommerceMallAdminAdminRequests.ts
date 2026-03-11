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

export async function patchEcommerceMallAdminAdminRequests(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.status && { status: props.body.status }),
  } satisfies Prisma.ecommerce_mall_admin_requestsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_admin_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { id: "desc" },
    }),
    MyGlobal.prisma.ecommerce_mall_admin_requests.count({ where: whereInput }),
  ]);
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      user: {
        id: record.user_id as string & tags.Format<"uuid">,
        email: "",
        is_suspended: false,
        created_at: toISOStringSafe(
          new Date("1970-01-01T00:00:00.000Z"),
        ) as string & tags.Format<"date-time">,
      } satisfies IEcommerceMallCustomer.ISummary,
      reason: record.reason,
      status: record.status as "pending" | "approved" | "rejected",
      responded_at: toISOStringSafe(
        new Date("1970-01-01T00:00:00.000Z"),
      ) as string & tags.Format<"date-time">,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
