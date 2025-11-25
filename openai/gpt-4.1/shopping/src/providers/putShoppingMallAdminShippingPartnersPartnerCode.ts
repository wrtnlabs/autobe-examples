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

export async function putShoppingMallAdminShippingPartnersPartnerCode(props: {
  admin: AdminPayload;
  partnerCode: string;
  body: IShoppingMallShippingPartner.IUpdate;
}): Promise<IShoppingMallShippingPartner> {
  // 1. Verify existence by partner_code.
  const existing =
    await MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
      where: { partner_code: props.partnerCode },
    });
  if (!existing) {
    throw new HttpException("Shipping partner not found", 404);
  }

  // 2. Enforce uniqueness constraints if changing partner_name
  if (
    props.body.partner_name &&
    props.body.partner_name !== existing.partner_name
  ) {
    const nameExists =
      await MyGlobal.prisma.shopping_mall_shipping_partners.findFirst({
        where: { partner_name: props.body.partner_name },
      });
    if (nameExists) {
      throw new HttpException(
        "This partner_name is already used by another partner.",
        409,
      );
    }
  }

  // 3. Enforce uniqueness constraints if changing partner_code
  if (
    props.body.partner_code &&
    props.body.partner_code !== props.partnerCode
  ) {
    const codeExists =
      await MyGlobal.prisma.shopping_mall_shipping_partners.findFirst({
        where: { partner_code: props.body.partner_code },
      });
    if (codeExists) {
      throw new HttpException(
        "This partner_code is already used by another partner.",
        409,
      );
    }
  }

  // 4. Update (including updated_at audit field)
  const dataForUpdate = {
    ...props.body,
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.shopping_mall_shipping_partners.update({
    where: { partner_code: props.partnerCode },
    data: dataForUpdate,
  });

  return {
    id: updated.id,
    partner_name: updated.partner_name,
    partner_code: updated.partner_code,
    status: updated.status,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at !== "undefined" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
