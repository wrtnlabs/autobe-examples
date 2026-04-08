import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductSnapshotTransformer } from "../transformers/EcommerceMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminProductsProductIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  productId: string;
  snapshotId: string;
}): Promise<IEcommerceMallProductSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        product_id: props.productId,
      },
      ...EcommerceMallProductSnapshotTransformer.select(),
    });
  return await EcommerceMallProductSnapshotTransformer.transform(snapshot);
}
