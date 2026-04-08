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
import { EcommerceMallProductVariantSnapshotOptionValueTransformer } from "../transformers/EcommerceMallProductVariantSnapshotOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminProductVariantSnapshotsSnapshotIdOptionValuesOptionValueId(props: {
  admin: AdminPayload;
  snapshotId: string;
  optionValueId: string;
}): Promise<IEcommerceMallProductVariantSnapshotOptionValue> {
  const optionValue =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshot_option_values.findUniqueOrThrow(
      {
        where: {
          id: props.optionValueId,
          ecommerce_mall_product_variant_snapshot_id: props.snapshotId,
        },
        ...EcommerceMallProductVariantSnapshotOptionValueTransformer.select(),
      },
    );
  return await EcommerceMallProductVariantSnapshotOptionValueTransformer.transform(
    optionValue,
  );
}
