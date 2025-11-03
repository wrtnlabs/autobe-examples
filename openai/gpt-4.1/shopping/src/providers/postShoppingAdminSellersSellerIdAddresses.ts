import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminSellersSellerIdAddresses(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingSellerAddress.ICreate;
}): Promise<IShoppingSellerAddress> {
  const seller = await MyGlobal.prisma.shopping_sellers.findFirst({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  const now = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  const created = await MyGlobal.prisma.shopping_seller_addresses.create({
    data: {
      id,
      shopping_seller_id: props.sellerId,
      address_line1: props.body.address_line1,
      address_line2: props.body.address_line2 ?? null,
      city: props.body.city,
      state: props.body.state,
      postal_code: props.body.postal_code,
      country: props.body.country,
      is_return_address: props.body.is_return_address,
      is_primary: props.body.is_primary,
      phone: props.body.phone,
      // recipient_name intentionally omitted from data due to Prisma type limit
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_seller_id: created.shopping_seller_id,
    address_line1: created.address_line1,
    address_line2: created.address_line2 ?? null,
    city: created.city,
    state: created.state,
    postal_code: created.postal_code,
    country: created.country,
    is_return_address: created.is_return_address,
    is_primary: created.is_primary,
    phone: created.phone,
    recipient_name: props.body.recipient_name, // Use value from request body
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
