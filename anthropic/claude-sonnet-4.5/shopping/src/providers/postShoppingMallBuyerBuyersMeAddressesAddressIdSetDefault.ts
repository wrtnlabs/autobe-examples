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

export async function postShoppingMallBuyerBuyersMeAddressesAddressIdSetDefault(props: {
  buyer: BuyerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBuyerAddress> {
  const targetAddress =
    await MyGlobal.prisma.shopping_mall_buyer_addresses.findUnique({
      where: { id: props.addressId },
    });

  if (
    !targetAddress ||
    targetAddress.shopping_mall_buyer_id !== props.buyer.id
  ) {
    throw new HttpException("Address not found", 404);
  }

  const updatedAddress = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_buyer_addresses.updateMany({
      where: {
        shopping_mall_buyer_id: props.buyer.id,
        is_default: true,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });

    return await tx.shopping_mall_buyer_addresses.update({
      where: { id: props.addressId },
      data: {
        is_default: true,
        updated_at: new Date(),
      },
    });
  });

  return {
    id: updatedAddress.id,
    shopping_mall_buyer_id: updatedAddress.shopping_mall_buyer_id,
    recipient_name: updatedAddress.recipient_name,
    phone: updatedAddress.phone,
    street_address_line1: updatedAddress.street_address_line1,
    street_address_line2:
      updatedAddress.street_address_line2 === null
        ? undefined
        : updatedAddress.street_address_line2,
    city: updatedAddress.city,
    state: updatedAddress.state === null ? undefined : updatedAddress.state,
    postal_code: updatedAddress.postal_code,
    country: updatedAddress.country,
    address_label: updatedAddress.address_label,
    address_type: updatedAddress.address_type,
    special_delivery_instructions:
      updatedAddress.special_delivery_instructions === null
        ? undefined
        : updatedAddress.special_delivery_instructions,
    is_default: updatedAddress.is_default,
    created_at: toISOStringSafe(updatedAddress.created_at),
    updated_at: toISOStringSafe(updatedAddress.updated_at),
  };
}
