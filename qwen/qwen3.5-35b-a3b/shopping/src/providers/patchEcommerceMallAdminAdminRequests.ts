import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminRequestRequestAtSummaryTransformer } from "../transformers/EcommerceMallAdminRequestRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminRequests(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminRequestRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminRequestRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be greater than or equal to 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_admin_request_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.request_status !== undefined && {
      request_status: props.body.request_status,
    }),
    ...(props.body.created_at_start !== undefined && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end !== undefined && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
    ...(props.body.requester_type !== undefined && {
      ...(props.body.requester_type === "customer"
        ? { customerRequests: { some: {} } }
        : { sellerRequests: { some: {} } }),
    }),
    ...(props.body.reason_search !== undefined && {
      reason: { contains: props.body.reason_search, mode: "insensitive" },
    }),
  } as Prisma.ecommerce_mall_admin_request_requestsWhereInput;
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput = (
    props.body.sort_by === "updated_at"
      ? { updated_at: sortOrder }
      : props.body.sort_by === "request_status"
        ? { request_status: sortOrder }
        : { created_at: sortOrder }
  ) as Prisma.ecommerce_mall_admin_request_requestsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallAdminRequestRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallAdminRequestRequestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallAdminRequestRequest.ISummary;
}
