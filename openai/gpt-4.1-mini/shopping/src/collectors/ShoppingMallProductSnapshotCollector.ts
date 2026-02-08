import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallProductSnapshot.ICreate;
    product: IEntity;
    name: string;
    description: string;
    categoryId: string;
    basePrice: number;
  }) {
    const id = v4();
    return {
      id,
      name: props.name,
      description: props.description,
      category_id: props.categoryId,
      base_price: props.basePrice,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      product: { connect: { id: props.product.id } },
    } satisfies Prisma.shopping_mall_product_snapshotsCreateInput;
  }
}
