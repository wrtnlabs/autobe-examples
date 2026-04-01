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

export async function getEcommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAddress> {
  const address =
    await MyGlobal.prisma.ecommerce_mall_addresses.findUniqueOrThrow({
      where: {
        id: props.addressId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        recipient_name: true,
        recipient_phone: true,
        street: true,
        city: true,
        state: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (address.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Not Found", 404);
  }
  const transformed = await EcommerceMallAddressTransformer.transform({
    id: address.id,
    customer: { id: address.ecommerce_mall_customer_id },
    recipient_name: address.recipient_name,
    recipient_phone: address.recipient_phone,
    street: address.street,
    city: address.city,
    state: address.state,
    is_default: address.is_default,
    created_at: address.created_at,
    updated_at: address.updated_at,
    deleted_at: address.deleted_at,
    orders: [],
    snapshots: [],
  });
  return transformed satisfies IEcommerceMallAddress;
}
