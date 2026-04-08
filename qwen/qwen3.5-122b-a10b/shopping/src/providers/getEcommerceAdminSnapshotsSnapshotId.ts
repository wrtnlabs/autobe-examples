import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceSellerSnapshotTransformer } from "../transformers/EcommerceSellerSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSellerSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_seller_snapshots.findFirstOrThrow({
      ...EcommerceSellerSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
      },
    });
  return await EcommerceSellerSnapshotTransformer.transform(record);
}
