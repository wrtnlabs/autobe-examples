import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAdminPromotionRequestAtSummaryTransformer } from "../transformers/EcommerceMallAdminPromotionRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerAdminPromotionRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAdminPromotionRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const createdAtCondition: Prisma.DateTimeFilter = {};
  if (
    props.body.submittedAtFrom !== undefined &&
    props.body.submittedAtFrom !== null
  ) {
    createdAtCondition.gte = new Date(props.body.submittedAtFrom);
  }
  if (
    props.body.submittedAtTo !== undefined &&
    props.body.submittedAtTo !== null
  ) {
    createdAtCondition.lte = new Date(props.body.submittedAtTo);
  }
  const updatedAtCondition: Prisma.DateTimeFilter = {};
  if (
    props.body.reviewedAtFrom !== undefined &&
    props.body.reviewedAtFrom !== null
  ) {
    updatedAtCondition.gte = new Date(props.body.reviewedAtFrom);
  }
  if (
    props.body.reviewedAtTo !== undefined &&
    props.body.reviewedAtTo !== null
  ) {
    updatedAtCondition.lte = new Date(props.body.reviewedAtTo);
  }
  const whereInput: Prisma.ecommerce_mall_admin_promotion_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.reviewerId !== undefined &&
      props.body.reviewerId !== null && { reviewer_id: props.body.reviewerId }),
    ...(Object.keys(createdAtCondition).length > 0 && {
      created_at: createdAtCondition,
    }),
    ...(Object.keys(updatedAtCondition).length > 0 && {
      updated_at: updatedAtCondition,
    }),
  };
  let orderByInput: Prisma.ecommerce_mall_admin_promotion_requestsOrderByWithRelationInput =
    { created_at: "desc" };
  if (props.body.sort !== undefined && props.body.sort !== null) {
    const [field, direction] = props.body.sort.split(":");
    const dir: "asc" | "desc" = direction === "asc" ? "asc" : "desc";
    if (field === "submittedAt") {
      orderByInput = { created_at: dir };
    } else if (field === "reviewedAt") {
      orderByInput = { updated_at: dir };
    } else if (field === "status") {
      orderByInput = { status: dir };
    }
  }
  const data =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallAdminPromotionRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallAdminPromotionRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
