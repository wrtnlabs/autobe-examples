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
import { EcommerceCustomerAddressTransformer } from "../transformers/EcommerceCustomerAddressTransformer";
import { EcommerceCustomerAtSummaryTransformer } from "../transformers/EcommerceCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerMeAddressesAddressIdDefault(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCustomerAddress> {
  const address =
    await MyGlobal.prisma.ecommerce_customer_addresses.findUniqueOrThrow({
      where: {
        id: props.addressId,
        ecommerce_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  const previousDefault =
    await MyGlobal.prisma.ecommerce_customer_addresses.findFirst({
      where: {
        ecommerce_customer_id: props.customer.id,
        is_default: true,
        id: { not: props.addressId },
        deleted_at: null,
      },
    });
  if (previousDefault) {
    await MyGlobal.prisma.ecommerce_customer_addresses.update({
      where: { id: previousDefault.id },
      data: { is_default: false },
    });
    await MyGlobal.prisma.ecommerce_orders.updateMany({
      where: { shipping_address_id: previousDefault.id },
      data: { shipping_address_id: props.addressId },
    });
  }
  await MyGlobal.prisma.ecommerce_customer_addresses.update({
    where: { id: props.addressId },
    data: { is_default: true },
  });
  const updatedAddress =
    await MyGlobal.prisma.ecommerce_customer_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...EcommerceCustomerAddressTransformer.select(),
    });
  return {
    id: updatedAddress.id,
    recipient_name: updatedAddress.recipient_name,
    phone: updatedAddress.phone,
    street_address: updatedAddress.street_address,
    city: updatedAddress.city,
    state: updatedAddress.state,
    postal_code: updatedAddress.postal_code,
    country: updatedAddress.country,
    is_default: updatedAddress.is_default,
    created_at: toISOStringSafe(updatedAddress.created_at),
    updated_at: toISOStringSafe(updatedAddress.updated_at),
    customer: await EcommerceCustomerAtSummaryTransformer.transform(
      updatedAddress.customer,
    ),
    deleted_at: updatedAddress.deleted_at
      ? toISOStringSafe(updatedAddress.deleted_at)
      : null,
  } satisfies IEcommerceCustomerAddress;
}
