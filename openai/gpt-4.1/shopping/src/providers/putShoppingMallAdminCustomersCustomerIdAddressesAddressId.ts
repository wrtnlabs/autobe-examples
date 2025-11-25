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

export async function putShoppingMallAdminCustomersCustomerIdAddressesAddressId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallAddress.IUpdate;
}): Promise<IShoppingMallAddress> {
  const address = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
    where: {
      id: props.addressId,
      shopping_mall_customer_id: props.customerId,
    },
  });
  if (!address) {
    throw new HttpException("Address not found for this customer", 404);
  }
  let updated;
  if (props.body.is_default) {
    updated = await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.shopping_mall_addresses.updateMany({
        where: {
          shopping_mall_customer_id: props.customerId,
          is_default: true,
        },
        data: { is_default: false },
      });
      return tx.shopping_mall_addresses.update({
        where: { id: props.addressId },
        data: {
          full_name: props.body.full_name,
          street: props.body.street,
          city: props.body.city,
          province: props.body.province,
          postal_code: props.body.postal_code,
          country: props.body.country,
          phone: props.body.phone,
          is_default: true,
        },
      });
    });
  } else {
    updated = await MyGlobal.prisma.shopping_mall_addresses.update({
      where: {
        id: props.addressId,
      },
      data: {
        full_name: props.body.full_name,
        street: props.body.street,
        city: props.body.city,
        province: props.body.province,
        postal_code: props.body.postal_code,
        country: props.body.country,
        phone: props.body.phone,
        is_default: false,
      },
    });
  }
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
    shopping_mall_customer_id: updated.shopping_mall_customer_id ?? null,
    shopping_mall_seller_id: updated.shopping_mall_seller_id ?? null,
  };
}
