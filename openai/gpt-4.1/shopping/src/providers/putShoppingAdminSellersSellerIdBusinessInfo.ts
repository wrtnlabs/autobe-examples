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

export async function putShoppingAdminSellersSellerIdBusinessInfo(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingSellerBusinessInfo.IUpdate;
}): Promise<IShoppingSellerBusinessInfo> {
  // Fetch the business info by shopping_seller_id
  const info = await MyGlobal.prisma.shopping_seller_business_infos.findUnique({
    where: { shopping_seller_id: props.sellerId },
  });
  if (!info) {
    throw new HttpException("Seller business info not found", 404);
  }
  // Prevent duplicate registration_number
  if (info.registration_number !== props.body.registration_number) {
    const overlap =
      await MyGlobal.prisma.shopping_seller_business_infos.findFirst({
        where: {
          registration_number: props.body.registration_number,
          shopping_seller_id: { not: props.sellerId },
        },
      });
    if (overlap) {
      throw new HttpException(
        "Registration number already exists for another seller",
        409,
      );
    }
  }
  // Update all mutable fields atomically
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_seller_business_infos.update({
    where: { shopping_seller_id: props.sellerId },
    data: {
      legal_entity_name: props.body.legal_entity_name,
      registration_number: props.body.registration_number,
      representative_name: props.body.representative_name,
      support_contact: props.body.support_contact,
      bank_account_number: props.body.bank_account_number,
      updated_at: now,
    },
  });
  // Return the new state per IShoppingSellerBusinessInfo (all required fields)
  return {
    id: updated.id,
    shopping_seller_id: updated.shopping_seller_id,
    legal_entity_name: updated.legal_entity_name,
    registration_number: updated.registration_number,
    representative_name: updated.representative_name,
    support_contact: updated.support_contact,
    bank_account_number: updated.bank_account_number,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
