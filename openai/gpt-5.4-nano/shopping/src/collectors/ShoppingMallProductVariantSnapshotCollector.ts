import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductVariantSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariantSnapshot.ICreate;
  }) {
    const now = new Date();
    return {
      id: v4(),
      code: props.body.code,
      name: props.body.name,
      price: props.body.price,
      currency: props.body.currency,
      is_available: props.body.is_available,
      variant_status: props.body.variant_status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      productVariant: {
        connect: { id: props.body.shopping_mall_product_variant_id },
      },
    } satisfies Prisma.shopping_mall_product_variant_snapshotsCreateInput;
  }
}
