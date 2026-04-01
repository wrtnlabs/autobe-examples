import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddressSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberAddressesAddressIdSnapshots(props: {
  member: MemberPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAddressSnapshot> {
  const address =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        recipient_name: true,
        phone_number: true,
        postal_code: true,
        country: true,
        city: true,
        street_line1: true,
        street_line2: true,
        deleted_at: true,
      },
    });
  if (address.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (address.shopping_mall_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const nowIso = toISOStringSafe(new Date());
  const createdSnapshot = await MyGlobal.prisma.$transaction(async (tx) => {
    const snapshotId = typia.assert<string & tags.Format<"uuid">>(v4());
    const snapshotCode = typia.assert<string & tags.Format<"uuid">>(v4());
    await tx.shopping_mall_snapshots.create({
      data: {
        id: snapshotId,
        snapshot_code: snapshotCode,
        source_type: "address_snapshot",
        source_entity_id: address.id,
        source_seller_id: null,
        source_order_id: null,
        source_order_item_id: null,
        source_review_id: null,
        source_cancellation_request_id: null,
        source_refund_request_id: null,
        created_by_member_id: props.member.id,
        reason: "address_snapshot_create",
        created_at: nowIso as never,
        updated_at: nowIso as never,
        deleted_at: null,
      },
    });
    const addressSnapshotId = typia.assert<string & tags.Format<"uuid">>(v4());
    const addressSnapshot = await tx.shopping_mall_address_snapshots.create({
      data: {
        id: addressSnapshotId,
        shopping_mall_address_id: address.id,
        recipient_name: address.recipient_name,
        recipient_phone: address.phone_number,
        postal_code: address.postal_code,
        region_line1: address.city,
        region_line2: address.country,
        street_address_line1: address.street_line1,
        street_address_line2: address.street_line2 ?? "",
        created_at: nowIso as never,
        updated_at: nowIso as never,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_address_id: true,
        recipient_name: true,
        recipient_phone: true,
        postal_code: true,
        region_line1: true,
        region_line2: true,
        street_address_line1: true,
        street_address_line2: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    await tx.shopping_mall_snapshot_parties.create({
      data: {
        id: typia.assert<string & tags.Format<"uuid">>(v4()),
        shopping_mall_snapshot_id: snapshotId,
        party_type: "owner",
        party_id: props.member.id,
        can_view: true,
        created_at: nowIso as never,
        updated_at: nowIso as never,
        deleted_at: null,
      },
    });
    return addressSnapshot;
  });
  return {
    id: createdSnapshot.id,
    shoppingMallAddressId: createdSnapshot.shopping_mall_address_id,
    recipientName: createdSnapshot.recipient_name,
    recipientPhone: createdSnapshot.recipient_phone,
    postalCode: createdSnapshot.postal_code,
    regionLine1: createdSnapshot.region_line1,
    regionLine2: createdSnapshot.region_line2,
    streetAddressLine1: createdSnapshot.street_address_line1,
    streetAddressLine2: createdSnapshot.street_address_line2,
    createdAt: toISOStringSafe(createdSnapshot.created_at),
    updatedAt: toISOStringSafe(createdSnapshot.updated_at),
    deletedAt:
      createdSnapshot.deleted_at === null
        ? null
        : toISOStringSafe(createdSnapshot.deleted_at),
  };
}
