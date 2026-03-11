import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAddressTransformer } from "../transformers/EcommerceMallAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IEcommerceMallAddress.IUpdate;
}): Promise<IEcommerceMallAddress> {
  // Find address and validate ownership
  const address =
    await MyGlobal.prisma.ecommerce_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      select: {
        id: true,
        customer_profile_id: true,
        user_id: true,
        recipient_name: true,
        phone_number: true,
        street_address: true,
        city: true,
        state_province: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customerProfile: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_customer_profilesFindManyArgs,
        user: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
      },
    });
  // Validate ownership
  if (address.customer_profile_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update address
  const updated = await MyGlobal.prisma.ecommerce_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      recipient_name: props.body.recipient_name ?? address.recipient_name,
      phone_number: props.body.phone_number ?? address.phone_number,
      street_address: props.body.street_address ?? address.street_address,
      city: props.body.city ?? address.city,
      state_province: props.body.state_province ?? address.state_province,
      postal_code: props.body.postal_code ?? address.postal_code,
      country: props.body.country ?? address.country,
      updated_at: new Date(),
    },
    ...EcommerceMallAddressTransformer.select(),
  });
  // Transform to response DTO
  return await EcommerceMallAddressTransformer.transform(updated);
}
