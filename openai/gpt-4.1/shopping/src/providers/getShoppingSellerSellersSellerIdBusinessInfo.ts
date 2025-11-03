import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSellerBusinessInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerBusinessInfo";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerSellersSellerIdBusinessInfo(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingSellerBusinessInfo> {
  const { seller, sellerId } = props;
  // Authorization: Seller can only access their own business info
  if (seller.id !== sellerId) {
    throw new HttpException(
      "Forbidden: You can only access your own business information.",
      403,
    );
  }
  const info = await MyGlobal.prisma.shopping_seller_business_infos.findUnique({
    where: { shopping_seller_id: sellerId },
  });
  if (!info) {
    throw new HttpException(
      "Business information not found for this seller.",
      404,
    );
  }
  return {
    id: info.id,
    shopping_seller_id: info.shopping_seller_id,
    legal_entity_name: info.legal_entity_name,
    registration_number: info.registration_number,
    representative_name: info.representative_name,
    support_contact: info.support_contact,
    bank_account_number: info.bank_account_number,
    created_at: toISOStringSafe(info.created_at),
    updated_at: toISOStringSafe(info.updated_at),
  };
}
