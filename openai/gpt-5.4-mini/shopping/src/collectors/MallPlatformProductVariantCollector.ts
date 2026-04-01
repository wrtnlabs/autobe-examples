import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformProductVariantCollector {
  export async function collect(props: {
    body: IMallPlatformProductVariant.ICreate;
    product: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      sku_code: props.body.skuCode,
      option_values: props.body.optionValues,
      price_override: props.body.priceOverride ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      product: { connect: { id: props.product.id } },
    } satisfies Prisma.mall_platform_product_variantsCreateInput;
  }
}
