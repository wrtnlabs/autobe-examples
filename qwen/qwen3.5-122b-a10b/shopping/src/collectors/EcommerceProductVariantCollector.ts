import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceProductVariantCollector {
  export async function collect(props: {
    body: IEcommerceProductVariant.ICreate;
    ecommerceProducts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      sku_code: props.body.sku_code,
      option_values: props.body.option_values,
      price: props.body.price ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.ecommerceProducts.id } },
    } satisfies Prisma.ecommerce_product_variantsCreateInput;
  }
}
