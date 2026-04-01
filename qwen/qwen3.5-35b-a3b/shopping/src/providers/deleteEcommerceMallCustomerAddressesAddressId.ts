import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify address exists and belongs to authenticated customer
  const address = await MyGlobal.prisma.ecommerce_mall_addresses.findFirst({
    where: {
      id: props.addressId,
      ecommerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (address === null) {
    throw new HttpException("Address not found", 404);
  }
  // 2. Check for associated orders in active states
  // Active states: waiting_for_shipping, shipped, cancelled (with pending refund)
  const associatedOrder = await MyGlobal.prisma.ecommerce_mall_orders.findFirst(
    {
      where: {
        shipping_address_id: props.addressId,
        deleted_at: null,
        status: {
          in: ["waiting_for_shipping", "shipped", "cancelled"],
        },
      },
    },
  );
  if (associatedOrder !== null) {
    throw new HttpException(
      "Address cannot be deleted while associated with an active order",
      400,
    );
  }
  // 3. Check if address is default - ensure customer has at least one other address
  if (address.is_default === true) {
    const otherAddresses = await MyGlobal.prisma.ecommerce_mall_addresses.count(
      {
        where: {
          ecommerce_mall_customer_id: props.customer.id,
          id: { not: props.addressId },
          deleted_at: null,
        },
      },
    );
    if (otherAddresses === 0) {
      throw new HttpException(
        "Cannot delete default address: customer must have at least one valid address",
        400,
      );
    }
  }
  // 4. Create snapshot before deletion
  await MyGlobal.prisma.ecommerce_mall_address_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      address: { connect: { id: props.addressId } },
      customer: { connect: { id: address.ecommerce_mall_customer_id } },
      recipient_name: address.recipient_name,
      recipient_phone: address.recipient_phone,
      street_address: address.street,
      city: address.city,
      state: address.state,
      zip_code: "",
      is_default: address.is_default,
      created_at: toISOStringSafe(new Date()),
    } satisfies Prisma.ecommerce_mall_address_snapshotsCreateInput,
  });
  // 5. Set deleted_at for soft deletion
  await MyGlobal.prisma.ecommerce_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    } satisfies Prisma.ecommerce_mall_addressesUpdateInput,
  });
}
