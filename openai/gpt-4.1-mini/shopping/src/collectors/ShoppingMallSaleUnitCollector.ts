import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSaleUnitCollector {
  export async function collect(props: {
    body: IShoppingMallSaleUnit.ICreate;
    sale: IEntity;
  }) {
    const id = v4();
    return {
      id,
      sku_code: props.body.sku_code,
      option_values: props.body.option_values,
      price_override: props.body.price_override ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      sale: { connect: { id: props.sale.id } },
      // saleUnitSnapshots skipped (optional has-many)
    } satisfies Prisma.shopping_mall_sale_unitsCreateInput;
  }
}
