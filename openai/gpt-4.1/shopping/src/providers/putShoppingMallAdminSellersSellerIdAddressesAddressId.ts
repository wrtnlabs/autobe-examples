import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminSellersSellerIdAddressesAddressId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallAddress.IUpdate;
}): Promise<IShoppingMallAddress> {
  const address = await MyGlobal.prisma.shopping_mall_addresses.findUnique({
    where: { id: props.addressId },
  });

  if (!address || address.shopping_mall_seller_id !== props.sellerId) {
    throw new HttpException(
      "Address not found or not associated with seller",
      404,
    );
  }

  if (props.body.is_default) {
    await MyGlobal.prisma.shopping_mall_addresses.updateMany({
      where: {
        shopping_mall_seller_id: props.sellerId,
        is_default: true,
        id: { not: props.addressId },
      },
      data: {
        is_default: false,
      },
    });
  }

  const updated = await MyGlobal.prisma.shopping_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      ...props.body,
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
      typeof updated.shopping_mall_customer_id === "string"
        ? undefined
        : (updated.shopping_mall_customer_id ?? undefined),
    shopping_mall_seller_id: updated.shopping_mall_seller_id ?? undefined,
  };
}
