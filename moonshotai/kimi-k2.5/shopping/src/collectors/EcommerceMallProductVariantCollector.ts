import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { EcommerceMallProductVariantOptionCollector } from "./EcommerceMallProductVariantOptionCollector";

export namespace EcommerceMallProductVariantCollector {
  export async function collect(props: {
    body: IEcommerceMallProductVariant.ICreate;
    ecommerceMallProducts: IEntity;
  }) {
    const id = v4();
    const now = new Date();
    return {
      id,
      sku_code: props.body.skuCode,
      price: props.body.price ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      product: { connect: { id: props.ecommerceMallProducts.id } },
      variantOptions: {
        create: await ArrayUtil.asyncMap(props.body.options, (option) =>
          EcommerceMallProductVariantOptionCollector.collect({
            body: option,
            ecommerceMallProductVariants: { id },
          }),
        ),
      },
      inventoryRecords:
        props.body.stock && props.body.stock > 0
          ? {
              create: {
                id: v4(),
                quantity_change: props.body.stock,
                reason: "initial_stock",
                created_at: now,
              },
            }
          : undefined,
    } satisfies Prisma.ecommerce_mall_product_variantsCreateInput;
  }
}
