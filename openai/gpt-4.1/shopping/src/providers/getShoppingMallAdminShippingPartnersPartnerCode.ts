import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShippingPartnersPartnerCode(props: {
  admin: AdminPayload;
  partnerCode: string;
}): Promise<IShoppingMallShippingPartner> {
  const partner =
    await MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
      where: { partner_code: props.partnerCode },
    });
  if (partner === null) {
    throw new HttpException("Shipping partner not found", 404);
  }
  return {
    id: partner.id,
    partner_name: partner.partner_name,
    partner_code: partner.partner_code,
    status: partner.status,
    description: partner.description,
    created_at: toISOStringSafe(partner.created_at),
    updated_at: toISOStringSafe(partner.updated_at),
    deleted_at:
      partner.deleted_at === null || partner.deleted_at === undefined
        ? undefined
        : toISOStringSafe(partner.deleted_at),
  };
}
