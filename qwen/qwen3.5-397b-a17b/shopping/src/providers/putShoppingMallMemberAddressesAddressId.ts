import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCustomerAddressTransformer } from "../transformers/ShoppingMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberAddressesAddressId(props: {
  member: MemberPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerAddress.IUpdate;
}): Promise<IShoppingMallCustomerAddress> {
  // Step 1: Verify the address exists and is not soft-deleted
  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findUniqueOrThrow({
      where: {
        id: props.addressId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_customer_profile_id: true,
      },
    });
  // Step 2: Verify ownership by checking the customer profile belongs to this member
  const profile =
    await MyGlobal.prisma.shopping_mall_customer_profiles.findUniqueOrThrow({
      where: { id: address.shopping_mall_customer_profile_id },
      select: {
        id: true,
        shopping_mall_member_id: true,
      },
    });
  if (profile.shopping_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: If setting as default, update all other addresses for this customer to non-default
  if (props.body.is_default === true) {
    await MyGlobal.prisma.shopping_mall_customer_addresses.updateMany({
      where: {
        shopping_mall_customer_profile_id:
          address.shopping_mall_customer_profile_id,
        id: { not: props.addressId },
        deleted_at: null,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
  }
  // Step 4: Update the address with provided fields
  await MyGlobal.prisma.shopping_mall_customer_addresses.update({
    where: { id: props.addressId },
    data: {
      ...(props.body.recipient_name !== undefined && {
        recipient_name: props.body.recipient_name,
      }),
      ...(props.body.recipient_phone !== undefined && {
        recipient_phone: props.body.recipient_phone,
      }),
      ...(props.body.street_address !== undefined && {
        street_address: props.body.street_address,
      }),
      ...(props.body.city !== undefined && { city: props.body.city }),
      ...(props.body.state_province !== undefined && {
        state_province: props.body.state_province,
      }),
      ...(props.body.postal_code !== undefined && {
        postal_code: props.body.postal_code,
      }),
      ...(props.body.country !== undefined && { country: props.body.country }),
      ...(props.body.is_default !== undefined && {
        is_default: props.body.is_default,
      }),
      updated_at: new Date(),
    },
  });
  // Step 5: Fetch and return the updated address using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...ShoppingMallCustomerAddressTransformer.select(),
    });
  return await ShoppingMallCustomerAddressTransformer.transform(updated);
}
