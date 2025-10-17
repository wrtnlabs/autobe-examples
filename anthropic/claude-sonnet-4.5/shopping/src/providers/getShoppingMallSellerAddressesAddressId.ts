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

export async function getShoppingMallSellerAddressesAddressId(props: {
  seller: SellerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAddress> {
  const { seller, addressId } = props;

  // Fetch the address by ID
  const address =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: addressId },
    });

  // Authorization: Verify ownership and user type
  if (
    address.shopping_mall_seller_id !== seller.id ||
    address.user_type !== "seller"
  ) {
    throw new HttpException(
      "Unauthorized: You can only access your own addresses",
      403,
    );
  }

  // Check soft deletion
  if (address.deleted_at !== null) {
    throw new HttpException("Address not found", 404);
  }

  // Return the address with only the fields defined in IShoppingMallAddress
  return {
    id: address.id as string & tags.Format<"uuid">,
    recipient_name: address.recipient_name,
    phone_number: address.phone_number,
    address_line1: address.address_line1,
  };
}
