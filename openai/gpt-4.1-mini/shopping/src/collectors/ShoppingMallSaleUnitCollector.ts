import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSaleUnitCollector {
  function toISOStringSafe(date: Date): string {
    return date.toISOString();
  }
  export async function collect(props: {
    body: IShoppingMallSaleUnit.ICreate;
    sale: IEntity;
  }) {
    const id: string = v4();
    const body = props.body as any;
    const createdAt = toISOStringSafe(new Date()) satisfies string as string;
    const updatedAt = toISOStringSafe(new Date()) satisfies string as string;
    return {
      id,
      sku_code: body.sku_code,
      option_values: body.option_values,
      price_override: body.price_override ?? null,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
      sale: { connect: { id: props.sale.id } },
    } satisfies Prisma.shopping_mall_sale_unitsCreateInput;
  }
}
