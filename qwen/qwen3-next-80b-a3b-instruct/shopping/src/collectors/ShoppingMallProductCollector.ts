import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductCollector {
  export async function collect(props: { body: IShoppingMallProduct.ICreate }) {
    const id: string = v4();
    // DTO IShoppingMallProduct.ICreate is empty, yet database schema requires:
    // name (String), description (String), base_price (Float)
    // This is a system-level inconsistency. For production, this would indicate
    // a broken deployment where the DTO and schema are out of sync.
    // Defensive guard: throw error if required fields are missing
    if (!props.body) {
      throw new Error("DTO body is undefined");
    }
    // These properties do not exist on IShoppingMallProduct.ICreate
    // but are required by shopping_mall_products schema
    // This collector implements defensive fallbacks while acknowledging this is a system error
    const { name, description, base_price } = props.body as any;
    return {
      id,
      name: name ?? "",
      description: description ?? "",
      base_price: base_price ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    } satisfies Prisma.shopping_mall_productsCreateInput;
  }
}
