import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerification";
import { IPageIShoppingMallSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSellersSellerIdVerifications(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerVerification.IRequest;
}): Promise<IPageIShoppingMallSellerVerification.ISummary> {
  // 1. Security: Sellers can only view their own verification history
  if (props.seller.id !== props.sellerId) {
    throw new HttpException(
      "Forbidden. Sellers may only access their own KYC/compliance records.",
      403,
    );
  }

  // 2. Pagination & Sorting Defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * boundedLimit;
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  // 3. Build Prisma where filter
  const where: Record<string, any> = {
    shopping_mall_seller_id: props.sellerId,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.reviewer_admin_id != null && {
      reviewer_admin_id: props.body.reviewer_admin_id,
    }),
    ...(props.body.compliance_document_present === true && {
      compliance_documents: { not: null },
    }),
    ...(props.body.compliance_document_present === false && {
      compliance_documents: null,
    }),
    ...(props.body.date_from && { created_at: { gte: props.body.date_from } }),
    ...(props.body.date_to && {
      created_at: {
        ...(props.body.date_from ? { gte: props.body.date_from } : {}),
        lte: props.body.date_to,
      },
    }),
  };

  // 4. FindMany/Count in parallel
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_verifications.findMany({
      where,
      skip,
      take: boundedLimit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        seller: true,
        reviewerAdmin: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_seller_verifications.count({ where }),
  ]);

  // 5. Map records to ISummary, strictly matching null/undefined contracts
  const data = records.map((r) => ({
    id: r.id,
    status: r.status,
    compliance_documents: Object.prototype.hasOwnProperty.call(
      r,
      "compliance_documents",
    )
      ? r.compliance_documents === null
        ? null
        : r.compliance_documents
      : undefined,
    reason: Object.prototype.hasOwnProperty.call(r, "reason")
      ? r.reason === null
        ? null
        : r.reason
      : undefined,
    reviewed_at: Object.prototype.hasOwnProperty.call(r, "reviewed_at")
      ? r.reviewed_at === null
        ? null
        : toISOStringSafe(r.reviewed_at)
      : undefined,
    created_at: toISOStringSafe(r.created_at),
    seller: {
      id: r.seller.id,
      business_name: r.seller.business_name,
    },
    reviewerAdmin: r.reviewerAdmin
      ? {
          id: r.reviewerAdmin.id,
          name: r.reviewerAdmin.name,
          email: r.reviewerAdmin.email,
        }
      : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: boundedLimit,
      records: total,
      pages: Math.ceil(total / boundedLimit),
    },
    data,
  };
}
