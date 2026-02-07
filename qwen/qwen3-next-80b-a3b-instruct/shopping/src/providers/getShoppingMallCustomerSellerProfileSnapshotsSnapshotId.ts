import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
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

export async function getShoppingMallCustomerSellerProfileSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  snapshotId: string;
}): Promise<IShoppingMallSellerProfileSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findUnique({
      where: { id: props.snapshotId },
    });
  if (!snapshot) {
    throw new HttpException("Snapshot not found", 404);
  }
  return {
    name: snapshot.name,
    description: snapshot.description,
    logo_url: snapshot.logo_url,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
