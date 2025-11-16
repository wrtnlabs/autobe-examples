import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function deleteShoppingMallBuyerBuyersMeAddressesAddressId(props: {
  buyer: BuyerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBuyerAddress> {
  const existingAddress =
    await MyGlobal.prisma.shopping_mall_buyer_addresses.findUnique({
      where: { id: props.addressId },
    });

  if (!existingAddress) {
    throw new HttpException("Address not found", 404);
  }

  if (existingAddress.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own addresses",
      403,
    );
  }

  const deletedAddress =
    await MyGlobal.prisma.shopping_mall_buyer_addresses.delete({
      where: { id: props.addressId },
    });

  return {
    id: deletedAddress.id,
    shopping_mall_buyer_id: deletedAddress.shopping_mall_buyer_id,
    recipient_name: deletedAddress.recipient_name,
    phone: deletedAddress.phone,
    street_address_line1: deletedAddress.street_address_line1,
    street_address_line2:
      deletedAddress.street_address_line2 === null
        ? undefined
        : deletedAddress.street_address_line2,
    city: deletedAddress.city,
    state: deletedAddress.state,
    postal_code: deletedAddress.postal_code,
    country: deletedAddress.country,
    address_label: deletedAddress.address_label,
    address_type: deletedAddress.address_type,
    special_delivery_instructions:
      deletedAddress.special_delivery_instructions === null
        ? undefined
        : deletedAddress.special_delivery_instructions,
    is_default: deletedAddress.is_default,
    created_at: toISOStringSafe(deletedAddress.created_at),
    updated_at: toISOStringSafe(deletedAddress.updated_at),
  };
}
