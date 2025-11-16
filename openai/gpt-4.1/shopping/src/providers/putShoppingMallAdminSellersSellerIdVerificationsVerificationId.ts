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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminSellersSellerIdVerificationsVerificationId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  verificationId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerVerification.IUpdate;
}): Promise<IShoppingMallSellerVerification> {
  // Step 1: Check seller exists
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  // Step 2: Find the verification and check if associated with the seller
  const verification =
    await MyGlobal.prisma.shopping_mall_seller_verifications.findUnique({
      where: { id: props.verificationId },
    });
  if (
    !verification ||
    verification.shopping_mall_seller_id !== props.sellerId
  ) {
    throw new HttpException(
      "Verification record not found for this seller",
      404,
    );
  }
  // Step 3: If reviewer_admin_id provided and not null, validate that admin exists
  let reviewerAdminSummary: IShoppingMallAdmin.ISummary | null | undefined =
    undefined;
  if (
    props.body.reviewer_admin_id !== undefined &&
    props.body.reviewer_admin_id !== null
  ) {
    const reviewerAdmin = await MyGlobal.prisma.shopping_mall_admins.findUnique(
      {
        where: { id: props.body.reviewer_admin_id },
      },
    );
    if (!reviewerAdmin) {
      throw new HttpException("Reviewer admin not found", 400);
    }
    reviewerAdminSummary = {
      id: reviewerAdmin.id,
      name: reviewerAdmin.name,
      email: reviewerAdmin.email,
    };
  } else if (props.body.reviewer_admin_id === null) {
    reviewerAdminSummary = null;
  }
  // Step 4: Update verification record
  const updated =
    await MyGlobal.prisma.shopping_mall_seller_verifications.update({
      where: { id: props.verificationId },
      data: {
        status: props.body.status ?? verification.status,
        compliance_documents:
          props.body.compliance_documents !== undefined
            ? props.body.compliance_documents
            : verification.compliance_documents,
        reason:
          props.body.reason !== undefined
            ? props.body.reason
            : verification.reason,
        reviewed_at:
          props.body.reviewed_at !== undefined
            ? props.body.reviewed_at
            : verification.reviewed_at,
        reviewer_admin_id:
          props.body.reviewer_admin_id !== undefined
            ? props.body.reviewer_admin_id
            : verification.reviewer_admin_id,
      },
    });
  // Step 5: Compose seller summary
  const sellerSummary = {
    id: seller.id,
    business_name: seller.business_name,
  };
  // Step 6: Compose and return API DTO
  return {
    id: updated.id,
    seller: sellerSummary,
    reviewer_admin:
      reviewerAdminSummary ??
      (updated.reviewer_admin_id != null
        ? await (async () => {
            const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique(
              {
                where: { id: updated.reviewer_admin_id ?? undefined },
              },
            );
            return admin
              ? { id: admin.id, name: admin.name, email: admin.email }
              : null;
          })()
        : undefined),
    status: updated.status,
    compliance_documents:
      updated.compliance_documents === null
        ? null
        : (updated.compliance_documents ?? undefined),
    reason: updated.reason === null ? null : (updated.reason ?? undefined),
    reviewed_at:
      updated.reviewed_at === null || updated.reviewed_at === undefined
        ? updated.reviewed_at
        : toISOStringSafe(updated.reviewed_at),
    created_at: toISOStringSafe(updated.created_at),
  };
}
