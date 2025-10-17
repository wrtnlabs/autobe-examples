import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerAddressesAddressId(props: {
  seller: SellerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallAddress.IUpdate;
}): Promise<IShoppingMallAddress> {
  const { seller, addressId, body } = props;

  const existingAddress =
    await MyGlobal.prisma.shopping_mall_addresses.findFirst({
      where: {
        id: addressId,
        shopping_mall_seller_id: seller.id,
        user_type: "seller",
        deleted_at: null,
      },
    });

  if (!existingAddress) {
    throw new HttpException(
      "Address not found or you do not have permission to update this address",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_addresses.update({
    where: { id: addressId },
    data: {
      recipient_name: body.recipient_name ?? undefined,
      city: body.city ?? undefined,
      is_verified: false,
      verified_at: undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    recipient_name: updated.recipient_name,
    phone_number: updated.phone_number,
    address_line1: updated.address_line1,
  };
}
