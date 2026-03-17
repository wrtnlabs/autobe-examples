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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminRequestAtSummaryTransformer } from "../transformers/ShoppingMallAdminRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminAdminRequests(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallAdminRequest.IRequest;
}): Promise<IPageIShoppingMallAdminRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_admin_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.requested_at_from !== undefined && {
      requested_at: {
        gte: new Date(props.body.requested_at_from),
      },
    }),
    ...(props.body.requested_at_to !== undefined && {
      requested_at: {
        lte: new Date(props.body.requested_at_to),
      },
    }),
  } satisfies Prisma.shopping_mall_admin_requestsWhereInput;
  const orderByInput: Prisma.shopping_mall_admin_requestsOrderByWithRelationInput =
    props.body.sort === "status"
      ? { status: props.body.direction ?? "desc" }
      : { requested_at: props.body.direction ?? "desc" };
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
