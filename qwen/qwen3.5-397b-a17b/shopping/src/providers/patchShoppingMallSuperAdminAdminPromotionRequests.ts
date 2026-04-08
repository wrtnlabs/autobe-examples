import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequest";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminPromotionRequestAtSummaryTransformer } from "../transformers/ShoppingMallAdminPromotionRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminAdminPromotionRequests(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallAdminPromotionRequest.IRequest;
}): Promise<IPageIShoppingMallAdminPromotionRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.actorType !== undefined && {
      actor_type: props.body.actorType,
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: {
        gte: props.body.createdAtFrom,
      },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        lte: props.body.createdAtTo,
      },
    }),
    ...(props.body.search !== undefined && {
      reason: {
        contains: props.body.search,
      },
    }),
  } satisfies Prisma.shopping_mall_admin_promotion_requestsWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallAdminPromotionRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.count({
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
      ShoppingMallAdminPromotionRequestAtSummaryTransformer.transform,
    ),
  };
}
