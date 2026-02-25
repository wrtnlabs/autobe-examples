import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerAtSummaryTransformer } from "../transformers/EcommerceCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IEcommerceCustomerAddress.IUpdate;
}): Promise<IEcommerceCustomerAddress> {
  const address =
    await MyGlobal.prisma.ecommerce_customer_addresses.findUniqueOrThrow({
      where: { id: props.addressId, ecommerce_customer_id: props.customer.id },
    });
  await MyGlobal.prisma.ecommerce_customer_address_snapshots.create({
    data: {
      customer_addresses_id: address.id,
      recipient_name: address.recipient_name,
      phone: address.phone,
      street: address.street_address,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
    },
  });
  const updateData = {
    recipient_name: props.body.recipient_name,
    phone: props.body.phone,
    street_address: props.body.street_address,
    city: props.body.city,
    state: props.body.state,
    postal_code: props.body.postal_code,
    is_default: props.body.is_default,
    updated_at: toISOStringSafe(new Date()),
  };
  await MyGlobal.prisma.ecommerce_customer_addresses.update({
    where: { id: props.addressId },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.ecommerce_customer_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      select: {
        id: true,
        recipient_name: true,
        phone: true,
        street_address: true,
        city: true,
        state: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
      },
    });
  return {
    id: updated.id,
    recipient_name: updated.recipient_name,
    phone: updated.phone,
    street_address: updated.street_address,
    city: updated.city,
    state: updated.state,
    postal_code: updated.postal_code,
    country: updated.country,
    is_default: updated.is_default,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    customer: await EcommerceCustomerAtSummaryTransformer.transform(
      updated.customer,
    ),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  } satisfies IEcommerceCustomerAddress;
}
