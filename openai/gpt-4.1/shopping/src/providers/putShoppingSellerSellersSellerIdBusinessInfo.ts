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

export async function putShoppingSellerSellersSellerIdBusinessInfo(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingSellerBusinessInfo.IUpdate;
}): Promise<IShoppingSellerBusinessInfo> {
  const { seller, sellerId, body } = props;
  if (seller.id !== sellerId) {
    throw new HttpException(
      "Forbidden: You cannot update another seller's business info",
      403,
    );
  }
  const existing =
    await MyGlobal.prisma.shopping_seller_business_infos.findUniqueOrThrow({
      where: { shopping_seller_id: sellerId },
    });
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_seller_business_infos.update({
    where: { shopping_seller_id: sellerId },
    data: {
      legal_entity_name: body.legal_entity_name,
      registration_number: body.registration_number,
      representative_name: body.representative_name,
      support_contact: body.support_contact,
      bank_account_number: body.bank_account_number,
      updated_at: now,
    },
  });
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
