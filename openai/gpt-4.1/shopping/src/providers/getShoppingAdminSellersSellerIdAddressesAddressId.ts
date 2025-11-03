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

export async function getShoppingAdminSellersSellerIdAddressesAddressId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingSellerAddress> {
  const address = await MyGlobal.prisma.shopping_seller_addresses.findFirst({
    where: {
      id: props.addressId,
      shopping_seller_id: props.sellerId,
      deleted_at: null,
    },
  });
  if (!address) {
    throw new HttpException("Address not found", 404);
  }
  return {
    id: address.id,
    shopping_seller_id: address.shopping_seller_id,
    address_line1: address.address_line1,
    address_line2: address.address_line2 ?? undefined,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country: address.country,
    is_return_address: address.is_return_address,
    is_primary: address.is_primary,
    phone: address.phone,
    recipient_name: (address as any).recipient_name,
    created_at: toISOStringSafe(address.created_at),
    updated_at: toISOStringSafe(address.updated_at),
    deleted_at: address.deleted_at
      ? toISOStringSafe(address.deleted_at)
      : undefined,
  };
}
