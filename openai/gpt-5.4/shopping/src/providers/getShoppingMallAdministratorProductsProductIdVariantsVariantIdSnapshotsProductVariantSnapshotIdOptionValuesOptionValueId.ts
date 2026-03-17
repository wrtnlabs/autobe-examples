import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductVariantSnapshotOptionValueTransformer } from "../transformers/ShoppingMallProductVariantSnapshotOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorProductsProductIdVariantsVariantIdSnapshotsProductVariantSnapshotIdOptionValuesOptionValueId(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  productVariantSnapshotId: string & tags.Format<"uuid">;
  optionValueId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariantSnapshotOptionValue> {
  const record =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshot_option_values.findFirstOrThrow(
      {
        where: {
          id: props.optionValueId,
          deleted_at: null,
          productVariantSnapshot: {
            id: props.productVariantSnapshotId,
            productVariant: {
              id: props.variantId,
              product: {
                id: props.productId,
              },
            },
          },
        },
        ...ShoppingMallProductVariantSnapshotOptionValueTransformer.select(),
      },
    );
  return await ShoppingMallProductVariantSnapshotOptionValueTransformer.transform(
    record,
  );
}
