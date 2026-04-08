import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceAdminRequestAtSummaryTransformer } from "../transformers/EcommerceAdminRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminRequests(props: {
  admin: AdminPayload;
  body: IEcommerceAdminRequest.IRequest;
}): Promise<IPageIEcommerceAdminRequest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_admin_requestsWhereInput = {
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.requester_type && {
      requester_type: props.body.requester_type,
    }),
    ...(props.body.search && {
      reason: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: props.body.created_at_from,
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: props.body.created_at_to,
      },
    }),
    ...(props.body.reviewed_at_from && {
      reviewed_at: {
        gte: props.body.reviewed_at_from,
      },
    }),
    ...(props.body.reviewed_at_to && {
      reviewed_at: {
        lte: props.body.reviewed_at_to,
      },
    }),
  } satisfies Prisma.ecommerce_admin_requestsWhereInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_admin_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceAdminRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_admin_requests.count({
      where: whereInput,
    }),
  ]);
  const pages: number = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceAdminRequestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceAdminRequest.ISummary;
}
