import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionRequestAtSummaryTransformer } from "../transformers/EcommerceMallAdminPromotionRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminPromotionRequests(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdminPromotionRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_admin_promotion_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== null && { status: props.body.status }),
    ...(props.body.reviewed !== null && {
      reviewer_id: props.body.reviewed ? { not: null } : null,
    }),
    ...(props.body.requesterType === "customer" && {
      requester_customer_id: { not: null },
      requester_seller_id: null,
    }),
    ...(props.body.requesterType === "seller" && {
      requester_seller_id: { not: null },
      requester_customer_id: null,
    }),
  };
  const orderBy = (() => {
    const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";
    switch (props.body.sortBy) {
      case "status":
        return {
          status: sortOrder,
        } satisfies Prisma.ecommerce_mall_admin_promotion_requestsOrderByWithRelationInput;
      case "reviewedAt":
        return {
          updated_at: sortOrder,
        } satisfies Prisma.ecommerce_mall_admin_promotion_requestsOrderByWithRelationInput;
      case "createdAt":
      default:
        return {
          created_at: sortOrder,
        } satisfies Prisma.ecommerce_mall_admin_promotion_requestsOrderByWithRelationInput;
    }
  })();
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallAdminPromotionRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.count({ where }),
  ]);
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallAdminPromotionRequestAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
