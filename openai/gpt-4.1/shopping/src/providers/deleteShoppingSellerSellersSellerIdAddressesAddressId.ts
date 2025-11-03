import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingSellerSellersSellerIdAddressesAddressId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingSellerAddress> {
  // 1. Fetch the address to delete
  const address = await MyGlobal.prisma.shopping_seller_addresses.findUnique({
    where: { id: props.addressId },
  });
  if (!address) throw new HttpException("Address not found", 404);

  // 2. Authorization check: seller must own the address
  if (address.shopping_seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden: You may only delete your own addresses",
      403,
    );
  }

  // 3. Already deleted -> soft delete idempotence
  if (address.deleted_at) {
    // Return transformed address with deleted_at
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
      recipient_name: "",
      created_at: toISOStringSafe(address.created_at),
      updated_at: toISOStringSafe(address.updated_at),
      deleted_at: address.deleted_at
        ? toISOStringSafe(address.deleted_at)
        : undefined,
    };
  }

  // 4. Prevent if this is the only primary or only return address
  const otherAddresses =
    await MyGlobal.prisma.shopping_seller_addresses.findMany({
      where: {
        shopping_seller_id: props.seller.id,
        id: { not: props.addressId },
        deleted_at: null,
      },
    });
  const hasOtherPrimary = otherAddresses.some((addr) => addr.is_primary);
  const hasOtherReturn = otherAddresses.some((addr) => addr.is_return_address);
  if (
    (!hasOtherPrimary && address.is_primary) ||
    (!hasOtherReturn && address.is_return_address)
  ) {
    throw new HttpException(
      "Cannot delete the only primary or only return address",
      409,
    );
  }

  // 5. Prevent deletion if there are active fulfillments referencing this address
  const activeFulfillment =
    await MyGlobal.prisma.shopping_order_fulfillments.findFirst({
      where: {
        shopping_seller_address_id: props.addressId,
        status: { notIn: ["cancelled"] },
      },
    });
  if (activeFulfillment) {
    throw new HttpException("Address is in use by active fulfillment(s)", 409);
  }

  // 6. Soft delete the address
  const deletedAt = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_seller_addresses.update({
    where: { id: props.addressId },
    data: {
      deleted_at: deletedAt,
      updated_at: deletedAt,
    },
  });

  // 7. Return the updated address DTO
  return {
    id: updated.id,
    shopping_seller_id: updated.shopping_seller_id,
    address_line1: updated.address_line1,
    address_line2:
      typeof updated.address_line2 === "string"
        ? updated.address_line2
        : undefined,
    city: updated.city,
    state: updated.state,
    postal_code: updated.postal_code,
    country: updated.country,
    is_return_address: updated.is_return_address,
    is_primary: updated.is_primary,
    phone: updated.phone,
    recipient_name: "",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: deletedAt,
  };
}
