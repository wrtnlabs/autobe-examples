import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerSellersSellerId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const { seller, sellerId } = props;

  // Authorization: Seller can only access their own profile
  if (seller.id !== sellerId) {
    throw new HttpException(
      "Forbidden: You can only access your own seller profile",
      403,
    );
  }

  // Retrieve seller account from database
  const sellerAccount =
    await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
      where: {
        id: sellerId,
      },
      select: {
        id: true,
        email: true,
        business_name: true,
        business_type: true,
        contact_person_name: true,
        phone: true,
        account_status: true,
        email_verified: true,
        created_at: true,
        updated_at: true,
      },
    });

  // Return DTO-compliant seller profile
  return {
    id: sellerAccount.id,
    email: sellerAccount.email,
    business_name: sellerAccount.business_name,
    business_type: sellerAccount.business_type,
    contact_person_name: sellerAccount.contact_person_name,
    phone: sellerAccount.phone,
    account_status: sellerAccount.account_status,
    email_verified: sellerAccount.email_verified,
    created_at: toISOStringSafe(sellerAccount.created_at),
    updated_at: toISOStringSafe(sellerAccount.updated_at),
  };
}
