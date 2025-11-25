import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function putShoppingMallBuyerBuyersMeAddressesAddressId(props: {
  buyer: BuyerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallBuyerAddress.IUpdate;
}): Promise<IShoppingMallBuyerAddress> {
  const existing =
    await MyGlobal.prisma.shopping_mall_buyer_addresses.findUnique({
      where: { id: props.addressId },
    });

  if (!existing) {
    throw new HttpException("Address not found", 404);
  }

  if (existing.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (props.body.is_default === true) {
    await MyGlobal.prisma.shopping_mall_buyer_addresses.updateMany({
      where: {
        shopping_mall_buyer_id: props.buyer.id,
        id: { not: props.addressId },
      },
      data: { is_default: false },
    });
  }

  const updateData: Record<string, unknown> = {};

  if (props.body.recipient_name !== undefined) {
    updateData.recipient_name = props.body
      .recipient_name satisfies string as string;
  }
  if (props.body.phone !== undefined) {
    updateData.phone = props.body.phone satisfies string as string;
  }
  if (props.body.street_address_line1 !== undefined) {
    updateData.street_address_line1 = props.body
      .street_address_line1 satisfies string as string;
  }
  if (props.body.street_address_line2 !== undefined) {
    updateData.street_address_line2 = props.body.street_address_line2 satisfies
      | string
      | null as string | null;
  }
  if (props.body.city !== undefined) {
    updateData.city = props.body.city satisfies string as string;
  }
  if (props.body.state !== undefined) {
    updateData.state = props.body.state satisfies string | null as
      | string
      | null;
  }
  if (props.body.postal_code !== undefined) {
    updateData.postal_code = props.body.postal_code satisfies string as string;
  }
  if (props.body.country !== undefined) {
    updateData.country = props.body.country satisfies string as string;
  }
  if (props.body.address_label !== undefined) {
    updateData.address_label = props.body
      .address_label satisfies string as string;
  }
  if (props.body.address_type !== undefined) {
    updateData.address_type = props.body.address_type;
  }
  if (props.body.special_delivery_instructions !== undefined) {
    updateData.special_delivery_instructions = props.body
      .special_delivery_instructions satisfies string | null as string | null;
  }
  if (props.body.is_default !== undefined) {
    updateData.is_default = props.body.is_default;
  }

  updateData.updated_at = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_buyer_addresses.update({
    where: { id: props.addressId },
    data: updateData,
  });

  return {
    id: updated.id,
    shopping_mall_buyer_id: updated.shopping_mall_buyer_id,
    recipient_name: updated.recipient_name,
    phone: updated.phone,
    street_address_line1: updated.street_address_line1,
    street_address_line2: updated.street_address_line2 ?? undefined,
    city: updated.city,
    state: updated.state ?? undefined,
    postal_code: updated.postal_code,
    country: updated.country,
    address_label: updated.address_label,
    address_type: updated.address_type,
    special_delivery_instructions:
      updated.special_delivery_instructions ?? undefined,
    is_default: updated.is_default,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
