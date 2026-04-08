import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductVariantSnapshotTransformer } from "../transformers/EcommerceMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminProductVariantsVariantIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  variantId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductVariantSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUnique({
      where: { id: props.snapshotId },
      ...EcommerceMallProductVariantSnapshotTransformer.select(),
    });
  if (snapshot === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  if (snapshot.product_variant_id !== props.variantId) {
    throw new HttpException("Snapshot not found", 404);
  }
  return await EcommerceMallProductVariantSnapshotTransformer.transform(
    snapshot,
  );
}
