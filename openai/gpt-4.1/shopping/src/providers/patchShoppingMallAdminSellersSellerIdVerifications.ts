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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSellersSellerIdVerifications(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerVerification.IRequest;
}): Promise<IPageIShoppingMallSellerVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limitRaw = props.body.limit ?? 20;
  const limit = Math.min(Math.max(limitRaw, 1), 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    shopping_mall_seller_id: props.sellerId,
  };
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  if (props.body.date_from) {
    where.created_at = Object.assign(where.created_at || {}, {
      gte: props.body.date_from,
    });
  }
  if (props.body.date_to) {
    where.created_at = Object.assign(where.created_at || {}, {
      lte: props.body.date_to,
    });
  }
  if (
    props.body.reviewer_admin_id !== undefined &&
    props.body.reviewer_admin_id !== null
  ) {
    where.reviewer_admin_id = props.body.reviewer_admin_id;
  }
  if (props.body.compliance_document_present === true) {
    where.compliance_documents = { not: null };
  } else if (props.body.compliance_document_present === false) {
    where.compliance_documents = null;
  }

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_verifications.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            business_name: true,
          },
        },
        reviewerAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.shopping_mall_seller_verifications.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((rec) => ({
      id: rec.id,
      status: rec.status,
      compliance_documents: rec.compliance_documents ?? undefined,
      reason: rec.reason ?? undefined,
      reviewed_at:
        rec.reviewed_at != null ? toISOStringSafe(rec.reviewed_at) : undefined,
      created_at: toISOStringSafe(rec.created_at),
      seller: {
        id: rec.seller.id,
        business_name: rec.seller.business_name,
      },
      reviewerAdmin: rec.reviewerAdmin
        ? {
            id: rec.reviewerAdmin.id,
            name: rec.reviewerAdmin.name,
            email: rec.reviewerAdmin.email,
          }
        : undefined,
    })),
  };
}
