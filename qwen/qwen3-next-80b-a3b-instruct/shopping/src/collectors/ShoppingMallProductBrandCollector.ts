import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBrand";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductBrandCollector {
  export async function collect(props: {
    body: IShoppingMallProductBrand.ICreate;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      logo_url: null,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.shopping_mall_product_brandsCreateInput;
  }
}
