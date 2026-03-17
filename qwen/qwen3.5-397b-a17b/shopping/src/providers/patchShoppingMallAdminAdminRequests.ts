import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRequest";
import { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminRequestAtSummaryTransformer } from "../transformers/ShoppingMallAdminRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminRequests(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminRequest.IRequest;
}): Promise<IPageIShoppingMallAdminRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const requestedAtFilter: Prisma.DateTimeFilter | undefined =
    props.body.requested_at_from !== undefined ||
    props.body.requested_at_to !== undefined
      ? {
          ...(props.body.requested_at_from !== undefined && {
            gte: new Date(props.body.requested_at_from),
          }),
          ...(props.body.requested_at_to !== undefined && {
            lte: new Date(props.body.requested_at_to),
          }),
        }
      : undefined;
  const whereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(requestedAtFilter !== undefined && { requested_at: requestedAtFilter }),
  } satisfies Prisma.shopping_mall_admin_requestsWhereInput;
  const orderByInput = (
    props.body.sort === "status"
      ? { status: props.body.direction === "asc" ? "asc" : "desc" }
      : { requested_at: props.body.direction === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.shopping_mall_admin_requestsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_admin_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallAdminRequestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_admin_requests.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdminRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
