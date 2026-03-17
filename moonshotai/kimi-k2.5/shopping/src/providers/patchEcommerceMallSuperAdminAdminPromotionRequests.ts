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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionRequestAtSummaryTransformer } from "../transformers/EcommerceMallAdminPromotionRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminPromotionRequests(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdminPromotionRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequest.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause based on filters
  const where: Prisma.ecommerce_mall_admin_promotion_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.reviewerId !== undefined &&
      props.body.reviewerId !== null && { reviewer_id: props.body.reviewerId }),
  };
  // Handle date range filters for submittedAt (created_at)
  if (
    (props.body.submittedAtFrom !== undefined &&
      props.body.submittedAtFrom !== null) ||
    (props.body.submittedAtTo !== undefined &&
      props.body.submittedAtTo !== null)
  ) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (
      props.body.submittedAtFrom !== undefined &&
      props.body.submittedAtFrom !== null
    ) {
      createdAtFilter.gte = new Date(props.body.submittedAtFrom);
    }
    if (
      props.body.submittedAtTo !== undefined &&
      props.body.submittedAtTo !== null
    ) {
      createdAtFilter.lte = new Date(props.body.submittedAtTo);
    }
    where.created_at = createdAtFilter;
  }
  // Handle date range filters for reviewedAt (updated_at)
  if (
    (props.body.reviewedAtFrom !== undefined &&
      props.body.reviewedAtFrom !== null) ||
    (props.body.reviewedAtTo !== undefined && props.body.reviewedAtTo !== null)
  ) {
    const updatedAtFilter: Prisma.DateTimeFilter = {};
    if (
      props.body.reviewedAtFrom !== undefined &&
      props.body.reviewedAtFrom !== null
    ) {
      updatedAtFilter.gte = new Date(props.body.reviewedAtFrom);
    }
    if (
      props.body.reviewedAtTo !== undefined &&
      props.body.reviewedAtTo !== null
    ) {
      updatedAtFilter.lte = new Date(props.body.reviewedAtTo);
    }
    where.updated_at = updatedAtFilter;
  }
  // Parse sort parameter
  const sortParts = props.body.sort?.split(":") ?? ["submittedAt", "desc"];
  const sortField = sortParts[0] ?? "submittedAt";
  const sortDirection = sortParts[1] ?? "desc";
  const orderByField = (
    sortField === "submittedAt"
      ? "created_at"
      : sortField === "reviewedAt"
        ? "updated_at"
        : sortField === "status"
          ? "status"
          : "created_at"
  ) satisfies keyof Prisma.ecommerce_mall_admin_promotion_requestsOrderByWithRelationInput;
  const orderBy: Prisma.ecommerce_mall_admin_promotion_requestsOrderByWithRelationInput =
    {
      [orderByField]: sortDirection === "asc" ? "asc" : "desc",
    };
  // Execute query with pagination
  const requests =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallAdminPromotionRequestAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.count({
      where,
    });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    requests,
    EcommerceMallAdminPromotionRequestAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
