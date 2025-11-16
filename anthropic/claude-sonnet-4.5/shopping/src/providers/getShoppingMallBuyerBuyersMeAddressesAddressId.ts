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

export async function getShoppingMallBuyerBuyersMeAddressesAddressId(props: {
  buyer: BuyerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBuyerAddress> {
  const address =
    await MyGlobal.prisma.shopping_mall_buyer_addresses.findUnique({
      where: {
        id: props.addressId,
      },
    });

  if (!address) {
    throw new HttpException("Address not found", 404);
  }

  if (address.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException(
      "Forbidden: You do not have access to this address",
      403,
    );
  }

  return {
    id: address.id,
    shopping_mall_buyer_id: address.shopping_mall_buyer_id,
    recipient_name: address.recipient_name,
    phone: address.phone,
    street_address_line1: address.street_address_line1,
    street_address_line2: address.street_address_line2,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country: address.country,
    address_label: address.address_label,
    address_type: address.address_type,
    special_delivery_instructions: address.special_delivery_instructions,
    is_default: address.is_default,
    created_at: toISOStringSafe(address.created_at),
    updated_at: toISOStringSafe(address.updated_at),
  };
}
