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
import { ShoppingMallAddressSnapshotTransformer } from "../transformers/ShoppingMallAddressSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberAddressesAddressIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  addressId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAddressSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_address_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_address_id: props.addressId,
        address: {
          shopping_mall_customer_id: props.member.id,
        },
      },
      ...ShoppingMallAddressSnapshotTransformer.select(),
    });
  return await ShoppingMallAddressSnapshotTransformer.transform(snapshot);
}
