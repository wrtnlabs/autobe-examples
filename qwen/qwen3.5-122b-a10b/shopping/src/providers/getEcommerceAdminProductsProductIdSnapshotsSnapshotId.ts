import { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceProductSnapshotTransformer } from "../transformers/EcommerceProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminProductsProductIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceProductSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_product_snapshots.findFirstOrThrow({
      ...EcommerceProductSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        ecommerce_product_id: props.productId,
      },
    });
  return await EcommerceProductSnapshotTransformer.transform(record);
}
