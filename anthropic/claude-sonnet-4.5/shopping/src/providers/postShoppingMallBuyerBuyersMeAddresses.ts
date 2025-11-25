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

export async function postShoppingMallBuyerBuyersMeAddresses(props: {
  buyer: BuyerPayload;
  body: IShoppingMallBuyerAddress.ICreate;
}): Promise<IShoppingMallBuyerAddress> {
  const addressId = v4() as string & tags.Format<"uuid">;
  const now = new Date();

  const existingAddressCount =
    await MyGlobal.prisma.shopping_mall_buyer_addresses.count({
      where: {
        shopping_mall_buyer_id: props.buyer.id,
      },
    });

  const isFirstAddress = existingAddressCount === 0;
  const shouldBeDefault = isFirstAddress || (props.body.is_default ?? false);

  if (shouldBeDefault && !isFirstAddress) {
    await MyGlobal.prisma.shopping_mall_buyer_addresses.updateMany({
      where: {
        shopping_mall_buyer_id: props.buyer.id,
        is_default: true,
      },
      data: {
        is_default: false,
      },
    });
  }

  const created = await MyGlobal.prisma.shopping_mall_buyer_addresses.create({
    data: {
      id: addressId,
      shopping_mall_buyer_id: props.buyer.id,
      recipient_name: props.body.recipient_name,
      phone: props.body.phone,
      street_address_line1: props.body.street_address_line1,
      street_address_line2: props.body.street_address_line2 ?? null,
      city: props.body.city,
      state:
        props.body.state !== undefined && props.body.state !== null
          ? (props.body.state satisfies string as string)
          : "",
      postal_code: props.body.postal_code,
      country: props.body.country,
      address_label: props.body.address_label,
      address_type: props.body.address_type,
      special_delivery_instructions:
        props.body.special_delivery_instructions ?? null,
      is_default: shouldBeDefault,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_buyer_id: created.shopping_mall_buyer_id as string &
      tags.Format<"uuid">,
    recipient_name: created.recipient_name,
    phone: created.phone,
    street_address_line1: created.street_address_line1,
    street_address_line2:
      created.street_address_line2 === null
        ? undefined
        : created.street_address_line2,
    city: created.city,
    state: created.state === "" ? undefined : created.state,
    postal_code: created.postal_code,
    country: created.country,
    address_label: created.address_label,
    address_type: created.address_type,
    special_delivery_instructions:
      created.special_delivery_instructions === null
        ? undefined
        : created.special_delivery_instructions,
    is_default: created.is_default,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
