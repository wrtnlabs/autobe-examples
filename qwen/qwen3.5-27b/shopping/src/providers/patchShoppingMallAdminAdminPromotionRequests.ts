import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequest";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminPromotionRequestAtSummaryTransformer } from "../transformers/ShoppingMallAdminPromotionRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminPromotionRequests(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminPromotionRequest.IRequest;
}): Promise<IPageIShoppingMallAdminPromotionRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.submittedAtFrom && {
      submitted_at: { gte: new Date(props.body.submittedAtFrom) },
    }),
    ...(props.body.submittedAtTo && {
      submitted_at: { lte: new Date(props.body.submittedAtTo) },
    }),
    ...(props.body.search && {
      reason: {
        contains: props.body.search,
      },
    }),
  } satisfies Prisma.shopping_mall_admin_promotion_requestsWhereInput;
  const orderByInput =
    (props.body.sort ?? "submitted_at") === "submitted_at"
      ? { submitted_at: props.body.order ?? "desc" }
      : (props.body.sort ?? "submitted_at") === "responded_at"
        ? { responded_at: props.body.order ?? "desc" }
        : { created_at: props.body.order ?? "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admin_promotion_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallAdminPromotionRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_admin_promotion_requests.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdminPromotionRequestAtSummaryTransformer.transform,
    ),
  };
}
