import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallProductVariantCollector {
  export async function collect(props: {
    body: IEcommerceMallProductVariant.ICreate;
    ecommerceMallProducts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      sku: props.body.sku,
      options: JSON.stringify(props.body.options),
      base_price: props.body.base_price,
      sale_price: props.body.sale_price ?? null,
      stock_quantity: props.body.stock_quantity,
      reserved_quantity: 0,
      status: props.body.status ?? "active",
      sort_order: props.body.sort_order ?? 0,
      is_default: props.body.is_default ?? false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.ecommerceMallProducts.id } },
    } satisfies Prisma.ecommerce_mall_product_variantsCreateInput;
  }
}
