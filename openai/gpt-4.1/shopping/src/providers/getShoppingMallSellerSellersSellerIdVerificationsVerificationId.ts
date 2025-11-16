import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerification";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerSellersSellerIdVerificationsVerificationId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerVerification> {
  // Ensure the requesting seller matches the target sellerId
  if (props.seller.id !== props.sellerId) {
    throw new HttpException(
      "You can only access your own verification records.",
      403,
    );
  }

  // Lookup the verification record scoped to the seller
  const verification =
    await MyGlobal.prisma.shopping_mall_seller_verifications.findFirst({
      where: {
        id: props.verificationId,
        shopping_mall_seller_id: props.sellerId,
      },
      include: {
        seller: true, // shopping_mall_sellers
        reviewerAdmin: true, // shopping_mall_admins nullable
      },
    });

  if (!verification) {
    throw new HttpException(
      "Verification record not found for this seller.",
      404,
    );
  }

  // Build seller summary
  const sellerSummary = {
    id: verification.seller.id,
    business_name: verification.seller.business_name,
  };

  // Build reviewer_admin summary, nullable
  let reviewerAdminSummary = undefined;
  if (
    verification.reviewerAdmin !== null &&
    verification.reviewerAdmin !== undefined
  ) {
    reviewerAdminSummary = {
      id: verification.reviewerAdmin.id,
      name: verification.reviewerAdmin.name,
      email: verification.reviewerAdmin.email,
    };
  }

  // Compose response
  return {
    id: verification.id,
    seller: sellerSummary,
    reviewer_admin:
      reviewerAdminSummary !== undefined ? reviewerAdminSummary : undefined,
    status: verification.status,
    compliance_documents: verification.compliance_documents ?? undefined,
    reason: verification.reason ?? undefined,
    reviewed_at: verification.reviewed_at
      ? toISOStringSafe(verification.reviewed_at)
      : undefined,
    created_at: toISOStringSafe(verification.created_at),
  };
}
