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

export async function getShoppingMallSellerSellersSellerIdAddressesAddressId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAddress> {
  const record = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
    where: {
      id: props.addressId,
      shopping_mall_seller_id: props.sellerId,
    },
  });
  if (!record) {
    throw new HttpException(
      "Address not found or not owned by this seller.",
      404,
    );
  }
  return {
    id: record.id,
    full_name: record.full_name,
    street: record.street,
    city: record.city,
    province: record.province,
    postal_code: record.postal_code,
    country: record.country,
    phone: record.phone,
    is_default: record.is_default,
    created_at: toISOStringSafe(record.created_at),
    shopping_mall_customer_id:
      record.shopping_mall_customer_id === null
        ? null
        : record.shopping_mall_customer_id,
    shopping_mall_seller_id:
      record.shopping_mall_seller_id === null
        ? null
        : record.shopping_mall_seller_id,
  };
}
