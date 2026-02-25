import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductVariantCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariant.ICreate;
    product: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      sku_code: props.body.skuCode,
      price_override: props.body.priceOverride ?? null,
      stock_quantity: props.body.stockQuantity,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.product.id } },
      snapshots: undefined,
      orderItems: undefined,
      productReviews: undefined,
      productReviewSnapshots: undefined,
      inventoryHistories: undefined,
    } satisfies Prisma.shopping_mall_product_variantsCreateInput;
  }
}
