import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
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

export async function patchEcommerceAdminOrdersOrderIdRefundRequests(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.IRequest;
}): Promise<IPageIEcommerceRefundRequest.ISummary> {
  const page = 1;
  const limit = 12;
  const skip = (page - 1) * limit;
  const whereInput = {
    ecommerce_order_id: props.orderId,
    status: props.body.status,
    deleted_at: null,
  } satisfies Prisma.ecommerce_refund_requestsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_refund_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      status: true,
      reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_refund_requests.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (item) => {
    return {
      id: item.id,
      status: item.status as "pending" | "approved" | "rejected",
      reason: item.reason,
      created_at: item.created_at ? toISOStringSafe(item.created_at) : "",
      updated_at: item.updated_at ? toISOStringSafe(item.updated_at) : "",
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
