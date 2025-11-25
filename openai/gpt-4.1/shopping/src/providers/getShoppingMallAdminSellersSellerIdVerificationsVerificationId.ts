import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerification";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSellersSellerIdVerificationsVerificationId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerVerification> {
  // Find the seller and ensure it exists
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  // Find the verification record and include the reviewer admin
  const verification =
    await MyGlobal.prisma.shopping_mall_seller_verifications.findUnique({
      where: { id: props.verificationId },
      include: { reviewerAdmin: true },
    });
  if (
    !verification ||
    verification.shopping_mall_seller_id !== props.sellerId
  ) {
    throw new HttpException("Verification not found for seller", 404);
  }

  return {
    id: verification.id,
    seller: {
      id: seller.id,
      business_name: seller.business_name,
    },
    reviewer_admin: verification.reviewerAdmin
      ? {
          id: verification.reviewerAdmin.id,
          name: verification.reviewerAdmin.name,
          email: verification.reviewerAdmin.email,
        }
      : undefined,
    status: verification.status,
    compliance_documents: verification.compliance_documents ?? undefined,
    reason: verification.reason ?? undefined,
    reviewed_at: verification.reviewed_at
      ? toISOStringSafe(verification.reviewed_at)
      : undefined,
    created_at: toISOStringSafe(verification.created_at),
  };
}
