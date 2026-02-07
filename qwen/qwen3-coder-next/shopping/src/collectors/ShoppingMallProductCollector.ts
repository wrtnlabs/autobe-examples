import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

/**
 * Safe Date to ISO string conversion for Prisma date-time fields
 */
function toISOStringSafe(date: Date): string {
  return date.toISOString();
}
export namespace ShoppingMallProductCollector {
  export async function collect(props: {
    body: IShoppingMallProduct.ICreate;
    shoppingMallSellers: IEntity;
    shoppingMallSubcategories?: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: "",
      description: "",
      base_price: 0,
      status: "draft",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      seller: { connect: { id: props.shoppingMallSellers.id } },
      subcategory: props.shoppingMallSubcategories?.id
        ? { connect: { id: props.shoppingMallSubcategories.id } }
        : undefined,
    } satisfies Prisma.shopping_mall_productsCreateInput;
  }
}
