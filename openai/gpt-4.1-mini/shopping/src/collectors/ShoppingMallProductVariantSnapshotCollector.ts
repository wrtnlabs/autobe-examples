import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductVariantSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariantSnapshot.ICreate & {
      sku_code: string;
      option_values: string;
      price_override?: number | null;
      stock_quantity: number;
      productVariantId: string;
    };
  }) {
    const id: string = v4();
    return {
      id,
      sku_code: props.body.sku_code,
      option_values: props.body.option_values,
      price_override: props.body.price_override ?? null,
      stock_quantity: props.body.stock_quantity,
      created_at: new Date(),
      productVariant: { connect: { id: props.body.productVariantId } },
    } satisfies Prisma.shopping_mall_product_variant_snapshotsCreateInput;
  }
}
