import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductCollector {
  export async function collect(props: {
    body: IShoppingMallProduct.ICreate;
    seller: IEntity;
    productSubcategory: IEntity;
  }) {
    const id = v4();
    return {
      id,
      name: "",
      description: "",
      base_price: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
      productSubcategory: { connect: { id: props.productSubcategory.id } },
    } satisfies Prisma.shopping_mall_productsCreateInput;
  }
}
