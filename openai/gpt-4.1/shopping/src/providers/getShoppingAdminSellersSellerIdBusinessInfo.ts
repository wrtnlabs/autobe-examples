import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSellerBusinessInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerBusinessInfo";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminSellersSellerIdBusinessInfo(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingSellerBusinessInfo> {
  const businessInfo =
    await MyGlobal.prisma.shopping_seller_business_infos.findFirst({
      where: { shopping_seller_id: props.sellerId },
      select: {
        id: true,
        shopping_seller_id: true,
        legal_entity_name: true,
        registration_number: true,
        representative_name: true,
        support_contact: true,
        bank_account_number: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!businessInfo) {
    throw new HttpException("Business info not found for seller", 404);
  }
  return {
    id: businessInfo.id,
    shopping_seller_id: businessInfo.shopping_seller_id,
    legal_entity_name: businessInfo.legal_entity_name,
    registration_number: businessInfo.registration_number,
    representative_name: businessInfo.representative_name,
    support_contact: businessInfo.support_contact,
    bank_account_number: businessInfo.bank_account_number,
    created_at: toISOStringSafe(businessInfo.created_at),
    updated_at: toISOStringSafe(businessInfo.updated_at),
  };
}
