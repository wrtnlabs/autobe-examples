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

export async function postShoppingSellerSellersSellerIdAddresses(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingSellerAddress.ICreate;
}): Promise<IShoppingSellerAddress> {
  const { seller, sellerId, body } = props;

  if (sellerId !== seller.id) {
    throw new HttpException(
      "Forbidden: Cannot create address for another seller.",
      403,
    );
  }

  // Duplicate detection WITHOUT recipient_name, which doesn't exist in schema
  const duplicate = await MyGlobal.prisma.shopping_seller_addresses.findFirst({
    where: {
      shopping_seller_id: sellerId,
      address_line1: body.address_line1,
      address_line2: body.address_line2 ?? null,
      city: body.city,
      state: body.state,
      postal_code: body.postal_code,
      country: body.country,
      is_primary: body.is_primary,
      is_return_address: body.is_return_address,
      phone: body.phone,
      deleted_at: null,
    },
  });
  if (duplicate) {
    throw new HttpException(
      "Conflict: Address with same fields already exists.",
      409,
    );
  }

  if (body.is_primary) {
    const primaryExists =
      await MyGlobal.prisma.shopping_seller_addresses.findFirst({
        where: {
          shopping_seller_id: sellerId,
          is_primary: true,
          deleted_at: null,
        },
      });
    if (primaryExists) {
      throw new HttpException(
        "Conflict: Only one primary address is allowed per seller.",
        409,
      );
    }
  }

  if (body.is_return_address) {
    const returnExists =
      await MyGlobal.prisma.shopping_seller_addresses.findFirst({
        where: {
          shopping_seller_id: sellerId,
          is_return_address: true,
          deleted_at: null,
        },
      });
    if (returnExists) {
      throw new HttpException(
        "Conflict: Only one return address is allowed per seller.",
        409,
      );
    }
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_seller_addresses.create({
    data: {
      id: v4(),
      shopping_seller_id: sellerId,
      address_line1: body.address_line1,
      address_line2: body.address_line2 ?? null,
      city: body.city,
      state: body.state,
      postal_code: body.postal_code,
      country: body.country,
      is_primary: body.is_primary,
      is_return_address: body.is_return_address,
      phone: body.phone,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    shopping_seller_id: created.shopping_seller_id,
    address_line1: created.address_line1,
    address_line2: created.address_line2 ?? undefined,
    city: created.city,
    state: created.state,
    postal_code: created.postal_code,
    country: created.country,
    is_primary: created.is_primary,
    is_return_address: created.is_return_address,
    phone: created.phone,
    recipient_name: body.recipient_name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
