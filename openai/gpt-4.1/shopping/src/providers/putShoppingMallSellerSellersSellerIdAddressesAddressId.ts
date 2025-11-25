import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerSellersSellerIdAddressesAddressId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallAddress.IUpdate;
}): Promise<IShoppingMallAddress> {
  // Step 1: Find address, ensure it belongs to the given seller
  const address = await MyGlobal.prisma.shopping_mall_addresses.findUnique({
    where: { id: props.addressId },
  });
  if (!address || address.shopping_mall_seller_id !== props.sellerId) {
    throw new HttpException(
      "The specified address does not exist or does not belong to this seller.",
      404,
    );
  }
  if (props.seller.id !== props.sellerId) {
    throw new HttpException(
      "Forbidden: cannot update another seller's address",
      403,
    );
  }

  // Step 2: If setting is_default to true, unset all other addresses of this seller
  if (props.body.is_default) {
    await MyGlobal.prisma.shopping_mall_addresses.updateMany({
      where: {
        shopping_mall_seller_id: props.sellerId,
        is_default: true,
        id: { not: props.addressId },
      },
      data: { is_default: false },
    });
  }

  // Step 3: Update the address
  const updated = await MyGlobal.prisma.shopping_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      full_name: props.body.full_name,
      street: props.body.street,
      city: props.body.city,
      province: props.body.province,
      postal_code: props.body.postal_code,
      country: props.body.country,
      phone: props.body.phone,
      is_default: props.body.is_default,
    },
  });

  return {
    id: updated.id,
    full_name: updated.full_name,
    street: updated.street,
    city: updated.city,
    province: updated.province,
    postal_code: updated.postal_code,
    country: updated.country,
    phone: updated.phone,
    is_default: updated.is_default,
    created_at: toISOStringSafe(updated.created_at),
    shopping_mall_customer_id:
      updated.shopping_mall_customer_id === null
        ? undefined
        : updated.shopping_mall_customer_id,
    shopping_mall_seller_id:
      updated.shopping_mall_seller_id === null
        ? undefined
        : updated.shopping_mall_seller_id,
  };
}
