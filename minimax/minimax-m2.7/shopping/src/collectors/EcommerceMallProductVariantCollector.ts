import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { EcommerceMallProductVariantOptionValueCollector } from "./EcommerceMallProductVariantOptionValueCollector";

export namespace EcommerceMallProductVariantCollector {
  /**
   * Collector for creating product variants.
   * Handles variant creation with nested option values via neighbor collector.
   */
  export async function collect(props: {
    body: IEcommerceMallProductVariant.ICreate;
    ecommerceMallProducts: IEntity;
    ecommerceMallSellers: IEntity;
    ecommerceMallSellerSessions: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      sku_code: props.body.sku_code,
      price: props.body.price ?? null,
      quantity: props.body.quantity ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation - Connect to parent product
      product: { connect: { id: props.ecommerceMallProducts.id } },
      // HasMany relation - Nested create with neighbor collector
      optionValues: props.body.option_values?.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.option_values,
              (option) =>
                EcommerceMallProductVariantOptionValueCollector.collect({
                  body: option,
                  productVariant: { id: "" },
                }),
            ),
          }
        : undefined,
    } satisfies Prisma.ecommerce_mall_product_variantsCreateInput;
  }
}
