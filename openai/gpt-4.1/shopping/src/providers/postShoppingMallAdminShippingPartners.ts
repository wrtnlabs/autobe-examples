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

export async function postShoppingMallAdminShippingPartners(props: {
  admin: AdminPayload;
  body: IShoppingMallShippingPartner.ICreate;
}): Promise<IShoppingMallShippingPartner> {
  // 1. Uniqueness validation for partner_name and partner_code
  const existing =
    await MyGlobal.prisma.shopping_mall_shipping_partners.findFirst({
      where: {
        OR: [
          { partner_name: props.body.partner_name },
          { partner_code: props.body.partner_code },
        ],
      },
    });
  if (existing) {
    // Conflict - either partner_name or partner_code already exists
    throw new HttpException(
      "Shipping partner with provided name or code already exists.",
      409,
    );
  }

  // 2. Prepare fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  // 3. Insert new shipping partner
  const created = await MyGlobal.prisma.shopping_mall_shipping_partners.create({
    data: {
      id,
      partner_name: props.body.partner_name,
      partner_code: props.body.partner_code,
      status: props.body.status,
      description: props.body.description,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 4. Return the created partner, with null for deleted_at
  return {
    id: created.id,
    partner_name: created.partner_name,
    partner_code: created.partner_code,
    status: created.status,
    description: created.description,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
