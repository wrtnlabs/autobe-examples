import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductSnapshotVariantAtInvertTransformer } from "../transformers/EcommerceMallProductSnapshotVariantAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminProductsProductIdVariantsVariantIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductSnapshotVariant.IInvert> {
  // Query the product snapshot first to verify ownership
  const productSnapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
    });
  // Verify the product snapshot belongs to the specified product
  if (productSnapshot.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant snapshot not found for the specified product",
      404,
    );
  }
  // Query the variant snapshot
  const variantSnapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_variants.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...EcommerceMallProductSnapshotVariantAtInvertTransformer.select(),
      },
    );
  // Verify the variant ID matches the path parameter
  if (variantSnapshot.id !== props.variantId) {
    throw new HttpException("Variant snapshot not found", 404);
  }
  // For admin, no additional ownership check needed - admins can view any snapshot
  // (The adminAuthorize decorator already validated the admin session)
  return await EcommerceMallProductSnapshotVariantAtInvertTransformer.transform(
    variantSnapshot,
  );
}
