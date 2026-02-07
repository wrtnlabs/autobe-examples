import { IEcommerceProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceProductVariantOptionCollector {
  export async function collect(props: {
    body: IEcommerceProductVariantOption.ICreate;
    ecommerceProductVariants: IEntity;
  }) {
    const id = v4();
    return {
      id,
      option_key: props.body.option_key,
      option_value: props.body.option_value,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      variant: { connect: { id: props.ecommerceProductVariants.id } },
    } satisfies Prisma.ecommerce_product_variant_optionsCreateInput;
  }
}
