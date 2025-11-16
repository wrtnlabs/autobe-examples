import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShippingPartnersPartnerCode(props: {
  admin: AdminPayload;
  partnerCode: string;
}): Promise<void> {
  // Confirm the shipping partner exists
  const partner =
    await MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
      where: { partner_code: props.partnerCode },
    });
  if (partner === null) {
    throw new HttpException("Shipping partner not found", 404);
  }

  // Perform the hard delete
  await MyGlobal.prisma.shopping_mall_shipping_partners.delete({
    where: { partner_code: props.partnerCode },
  });
}
