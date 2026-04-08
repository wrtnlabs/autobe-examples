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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallAdminPromotionRequestAtSummaryTransformer } from "../transformers/EcommerceMallAdminPromotionRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerAdminPromotionRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallAdminPromotionRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build where conditions - filter by requester (current seller)
  const where: Prisma.ecommerce_mall_admin_promotion_requestsWhereInput = {
    deleted_at: null,
    sellerRequest: {
      seller: {
        id: props.seller.id,
      },
    },
  };
  // Filter by status if provided
  if (props.body.status !== null) {
    where.status = props.body.status;
  }
  // Filter by reviewed status
  if (props.body.reviewed !== null) {
    if (props.body.reviewed) {
      where.reviewer_id = { not: null };
    } else {
      where.reviewer_id = null;
    }
  }
  // Build order by based on sort criteria
  let orderBy: Prisma.ecommerce_mall_admin_promotion_requestsOrderByWithRelationInput;
  const sortOrder = props.body.sortOrder ?? "desc";
  switch (props.body.sortBy) {
    case "createdAt":
      orderBy = { created_at: sortOrder };
      break;
    case "reviewedAt":
      orderBy = { updated_at: sortOrder };
      break;
    case "status":
      orderBy = { status: sortOrder };
      break;
    default:
      orderBy = { created_at: "desc" };
  }
  // Cursor-based pagination if cursor provided
  let cursor:
    | Prisma.ecommerce_mall_admin_promotion_requestsWhereUniqueInput
    | undefined;
  if (props.body.cursor !== null) {
    cursor = { id: props.body.cursor };
  }
  // Fetch paginated data
  const requests =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findMany({
      where,
      ...EcommerceMallAdminPromotionRequestAtSummaryTransformer.select(),
      skip: cursor ? 1 : skip,
      take: limit,
      cursor,
      orderBy,
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.count({
      where,
    });
  // Transform results using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    requests,
    EcommerceMallAdminPromotionRequestAtSummaryTransformer.transform,
  );
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    data: transformedData,
    pagination,
  };
}
