import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
      sku_code: props.body.skuCode,
      price: props.body.price ?? null,
      stock_quantity: props.body.stockQuantity,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.ecommerceMallProducts.id } },
      variantOptions: {
        create: props.body.optionValues.map((option) => ({
          id: v4(),
          key: option.key,
          value: option.value,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      },
    } satisfies Prisma.ecommerce_mall_product_variantsCreateInput;
  }
}
