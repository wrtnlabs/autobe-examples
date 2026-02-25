import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceRefundRequestAtSummaryTransformer } from "../transformers/EcommerceRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorRefundRequests(props: {
  administrator: AdministratorPayload;
  body: IEcommerceRefundRequest.IRequest;
}): Promise<IPageIEcommerceRefundRequest.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // First, resolve the status IDs before building the where clause
  const statusIds = props.body.status
    ? await MyGlobal.prisma.ecommerce_refund_request_statuses
        .findMany({
          where: {
            status: props.body.status,
          },
          distinct: ["ecommerce_refund_request_id"],
          orderBy: { created_at: "desc" as const },
          select: { id: true },
        })
        .then((statuses) => statuses.map((s) => s.id))
    : undefined;
  // Build where clause based on filters
  const whereClause: Prisma.ecommerce_refund_requestsWhereInput = {
    deleted_at: null,
    reason: props.body.search
      ? { contains: props.body.search, mode: "insensitive" as const }
      : undefined,
    ...(props.body.requested_at_start && {
      requested_at: { gte: props.body.requested_at_start },
    }),
    ...(props.body.requested_at_end && {
      requested_at: { lte: props.body.requested_at_end },
    }),
    ...(props.body.status &&
      statusIds && {
        statusHistories: {
          some: {
            status: props.body.status,
            id: {
              in: statusIds,
            },
          },
        },
      }),
  };
  // Filter out undefined values
  const cleanWhere = Object.fromEntries(
    Object.entries(whereClause).filter(([_, v]) => v !== undefined),
  ) as Prisma.ecommerce_refund_requestsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_refund_requests.findMany({
    where: cleanWhere,
    skip,
    take: limit,
    orderBy: { requested_at: "desc" as const },
    ...EcommerceRefundRequestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_refund_requests.count({
    where: cleanWhere,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceRefundRequestAtSummaryTransformer.transform,
  );
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
