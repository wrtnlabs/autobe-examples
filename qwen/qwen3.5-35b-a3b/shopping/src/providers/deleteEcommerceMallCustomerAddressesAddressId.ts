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
  // Step 1: Retrieve address and verify it belongs to the authenticated customer
  const address =
    await MyGlobal.prisma.ecommerce_mall_addresses.findFirstOrThrow({
      where: {
        id: props.addressId,
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  // Step 2: Check for associated orders in active states
  // Active order statuses: waiting_for_shipping, shipped, cancelled (with pending refund)
  const activeOrders = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: {
      shipping_address_id: props.addressId,
      status: {
        in: ["waiting_for_shipping", "shipped", "cancelled"],
      },
      deleted_at: null,
    },
  });
  // Reject deletion if address is associated with active orders
  if (activeOrders.length > 0) {
    throw new HttpException(
      "Cannot delete address associated with active orders",
      400,
    );
  }
  // Step 3: Validate default address handling
  // If address is marked as default, customer must have at least one alternative address
  if (address.is_default) {
    const alternativeAddresses =
      await MyGlobal.prisma.ecommerce_mall_addresses.findMany({
        where: {
          ecommerce_mall_customer_id: props.customer.id,
          is_default: false,
          deleted_at: null,
        },
        take: 1,
      });
    if (alternativeAddresses.length === 0) {
      throw new HttpException(
        "Cannot delete default address without an alternative address",
        400,
      );
    }
  }
  // Step 4: Create snapshot before deletion for audit trail
  const snapshotId = v4() as string & tags.Format<"uuid">;
  const currentTimestamp: string & tags.Format<"date-time"> =
    new Date().toISOString();
  await MyGlobal.prisma.ecommerce_mall_address_snapshots.create({
    data: {
      id: snapshotId,
      address: { connect: { id: props.addressId } },
      customer: { connect: { id: address.ecommerce_mall_customer_id } },
      recipient_name: address.recipient_name,
      recipient_phone: address.recipient_phone,
      street_address: address.street,
      city: address.city,
      state: address.state,
      zip_code: "",
      is_default: address.is_default,
      created_at: address.created_at.toISOString(),
    },
  });
  // Step 5: Soft delete the address by setting deleted_at timestamp
  await MyGlobal.prisma.ecommerce_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      deleted_at: currentTimestamp,
      updated_at: currentTimestamp,
    },
  });
  // Step 6: Return void (204 No Content)
}
