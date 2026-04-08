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
    product: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      sku_code: props.body.skuCode,
      price: props.body.price ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.product.id } },
      variantOptions: props.body.options.length
        ? {
            create: await ArrayUtil.asyncMap(props.body.options, (option) =>
              EcommerceMallProductVariantOptionCollector.collect({
                body: option,
                ecommerceMallProductVariants: { id },
              }),
            ),
          }
        : undefined,
    } satisfies Prisma.ecommerce_mall_product_variantsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallProductVariantCollector {
//         export async function collect(props: {
//           body: IEcommerceMallProductVariant.ICreate;
//           ecommerceMallProducts: IEntity; // from path parameter productId
// ecommerceMallSellers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       sku_code: ...,
//       price: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       product: ...,
//       variantOptions: ...,
//       cartItems: ...,
//       inventoryRecords: ...,
//       orderItems: ...,
//       snapshots: ...,
//           } satisfies Prisma.ecommerce_mall_product_variantsCreateInput;
//         }
//       }
//--------------------------------------------------------------