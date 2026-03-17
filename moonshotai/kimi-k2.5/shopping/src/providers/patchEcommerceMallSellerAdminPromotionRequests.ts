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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallAdminPromotionRequestAtSummaryTransformer } from "../transformers/EcommerceMallAdminPromotionRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerAdminPromotionRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallAdminPromotionRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequest.ISummary> {
  // Verify seller is a super administrator
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
    where: { id: props.seller.id },
    select: { id: true, grade: true },
  });
  if (admin === null || admin.grade !== "super_admin") {
    throw new HttpException(
      "Forbidden: Requires super administrator privileges",
      403,
    );
  }
  // Build base where conditions
  const where: Prisma.ecommerce_mall_admin_promotion_requestsWhereInput = {
    deleted_at: null,
  };
  // Apply status filter
  if (props.body.status !== undefined && props.body.status !== null) {
    where.status = props.body.status;
  }
  // Apply reviewer filter
  if (props.body.reviewerId !== undefined && props.body.reviewerId !== null) {
    where.reviewer_id = props.body.reviewerId;
  }
  // Apply date range filters for submission
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
  if (Object.keys(createdAtFilter).length > 0) {
    where.created_at = createdAtFilter;
  }
  // Apply date range filters for review
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
  if (Object.keys(updatedAtFilter).length > 0) {
    where.updated_at = updatedAtFilter;
  }
  // Handle polymorphic requester filtering
  if (
    props.body.requesterType !== undefined &&
    props.body.requesterType !== null
  ) {
    if (props.body.requesterType === "customer") {
      if (
        props.body.requesterId !== undefined &&
        props.body.requesterId !== null
      ) {
        where.customerSubtype = { customer_id: props.body.requesterId };
      } else {
        where.customerSubtype = { isNot: null };
      }
    } else if (props.body.requesterType === "seller") {
      if (
        props.body.requesterId !== undefined &&
        props.body.requesterId !== null
      ) {
        where.sellerRequest = { seller_id: props.body.requesterId };
      } else {
        where.sellerRequest = { isNot: null };
      }
    }
  } else if (
    props.body.requesterId !== undefined &&
    props.body.requesterId !== null
  ) {
    // If only requesterId is provided without type, filter by both subtypes
    where.OR = [
      { customerSubtype: { customer_id: props.body.requesterId } },
      { sellerRequest: { seller_id: props.body.requesterId } },
    ];
  }
  // Parse sort parameter
  let orderBy: Prisma.ecommerce_mall_admin_promotion_requestsOrderByWithRelationInput =
    { created_at: "desc" };
  if (props.body.sort !== undefined && props.body.sort !== null) {
    const sortParts = props.body.sort.split(":");
    const field = sortParts[0];
    const direction = sortParts[1] === "asc" ? "asc" : "desc";
    if (field === "submittedAt" || field === "createdAt") {
      orderBy = { created_at: direction };
    } else if (field === "status") {
      orderBy = { status: direction };
    } else if (field === "reviewedAt" || field === "updatedAt") {
      orderBy = { updated_at: direction };
    }
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Execute queries sequentially (not in parallel to avoid type issues)
  const records =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallAdminPromotionRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.count({
      where,
    });
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallAdminPromotionRequestAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
