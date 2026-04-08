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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAdminPromotionRequestAtSummaryTransformer } from "../transformers/EcommerceMallAdminPromotionRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerAdminPromotionRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAdminPromotionRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequest.ISummary> {
  // Verify the customer is a super administrator
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
      grade: true,
    },
  });
  if (admin === null || admin.grade !== "super_admin") {
    throw new HttpException(
      "Forbidden: Only super administrators can access this resource",
      403,
    );
  }
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause based on filters
  const whereConditions: Prisma.ecommerce_mall_admin_promotion_requestsWhereInput =
    {
      deleted_at: null,
    };
  if (body.status !== null && body.status !== undefined) {
    whereConditions.status = body.status;
  }
  if (body.reviewed === true) {
    whereConditions.reviewer_id = { not: null };
  } else if (body.reviewed === false) {
    whereConditions.reviewer_id = null;
  }
  // Handle requester type filtering through polymorphic relations
  if (body.requesterType === "customer") {
    whereConditions.customerSubtype = {
      isNot: null,
    };
  } else if (body.requesterType === "seller") {
    whereConditions.sellerRequest = {
      isNot: null,
    };
  }
  // Build orderBy clause
  let orderBy: Prisma.ecommerce_mall_admin_promotion_requestsOrderByWithRelationInput;
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";
  if (body.sortBy === "createdAt") {
    orderBy = { created_at: sortOrder };
  } else if (body.sortBy === "reviewedAt") {
    orderBy = { updated_at: sortOrder };
  } else if (body.sortBy === "status") {
    orderBy = { status: sortOrder };
  } else {
    // Default sort by created_at desc
    orderBy = { created_at: "desc" };
  }
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallAdminPromotionRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.count({
      where: whereConditions,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallAdminPromotionRequestAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
