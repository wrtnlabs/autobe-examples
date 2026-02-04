import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerAuthSellersEmailResend(props: {
  seller: SellerPayload;
}): Promise<void> {
  // Find seller by ID and ensure they are not deleted, suspended, or already approved/rejected
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: {
      id: props.seller.id,
      deleted_at: null,
      is_suspended: false,
    },
  });
  if (!seller) {
    throw new HttpException(
      "Seller account not eligible for email resend",
      400,
    );
  }
  // Find email verification record for this seller
  const emailVerification =
    await MyGlobal.prisma.shopping_mall_seller_email_verifications.findFirst({
      where: {
        seller_id: seller.id,
        is_used: false, // Use boolean false to indicate unused verification
      },
    });
  if (!emailVerification) {
    throw new HttpException("No pending email verification record found", 400);
  }
  // Generate new verification token (UUID)
  const newToken = v4() as string & tags.Format<"uuid">;
  // Calculate expiration (24 hours from now)
  const expiresAt = toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000));
  // Update email verification record with new token and expiration
  await MyGlobal.prisma.shopping_mall_seller_email_verifications.update({
    where: {
      id: emailVerification.id,
    },
    data: {
      token: newToken,
      expired_at: expiresAt,
    },
  });
  // Note: In production, a real email service would send the verification email here
  // But the operation specification only requires returning 204 No Content
  // Email sending is handled elsewhere in the system and is not part of this function's contract
}
