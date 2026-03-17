import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallProductVariantOptionCollector {
  export async function collect(props: {
    body: IEcommerceMallProductVariantOption.ICreate;
    ecommerceMallProductVariants: IEntity;
  }) {
    const id = v4();
    return {
      id,
      option_name: props.body.optionName,
      option_value: props.body.optionValue,
      created_at: new Date(),
      updated_at: new Date(),
      productVariant: {
        connect: { id: props.ecommerceMallProductVariants.id },
      },
    } satisfies Prisma.ecommerce_mall_product_variant_optionsCreateInput;
  }
}
