import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddressSnapshot";
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

export async function patchShoppingMallMemberAddressesAddressIdSnapshots(props: {
  member: MemberPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallAddressSnapshot.IRequest;
}): Promise<IPageIShoppingMallAddressSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const allowedSourceEntityIds = new Set(
    (
      await MyGlobal.prisma.shopping_mall_snapshots.findMany({
        where: {
          source_type: "address_snapshot",
          deleted_at: null,
          snapshotParties: {
            some: {
              can_view: true,
              deleted_at: null,
              party_type: "member",
              party_id: props.member.id,
            } satisfies Prisma.shopping_mall_snapshot_partiesWhereInput,
          },
        },
        select: { source_entity_id: true },
      })
    ).map((r) => r.source_entity_id),
  );
  const total = await MyGlobal.prisma.shopping_mall_address_snapshots.count({
    where: {
      shopping_mall_address_id: props.addressId,
      deleted_at: undefined,
      ...(allowedSourceEntityIds.size > 0
        ? { id: { in: Array.from(allowedSourceEntityIds) } }
        : { id: { in: ["00000000-0000-0000-0000-000000000000"] } }),
    },
  });
  if (total === 0) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      },
      data: [],
    } satisfies IPageIShoppingMallAddressSnapshot.ISummary;
  }
  const records =
    await MyGlobal.prisma.shopping_mall_address_snapshots.findMany({
      where: {
        shopping_mall_address_id: props.addressId,
        ...(allowedSourceEntityIds.size > 0
          ? { id: { in: Array.from(allowedSourceEntityIds) } }
          : { id: { in: ["00000000-0000-0000-0000-000000000000"] } }),
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
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
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      shopping_mall_address_id: r.shopping_mall_address_id,
      recipient_name: r.recipient_name,
      recipient_phone: r.recipient_phone,
      postal_code: r.postal_code,
      region_line1: r.region_line1,
      region_line2: r.region_line2,
      street_address_line1: r.street_address_line1,
      street_address_line2: r.street_address_line2,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
    })) satisfies IShoppingMallAddressSnapshot.ISummary[],
  } satisfies IPageIShoppingMallAddressSnapshot.ISummary;
}
