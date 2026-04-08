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
  export async function collect(props: {
    body: IEcommerceMallProductVariant.ICreate;
    ecommerceMallProducts: IEntity;
    ecommerceMallSellers: IEntity;
    ecommerceMallSellerSessions: IEntity;
  }) {
    const variantId: string = v4();
    return {
      // Scalar fields
      id: variantId,
      sku_code: props.body.skuCode,
      price: props.body.price ?? null,
      quantity: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      product: { connect: { id: props.ecommerceMallProducts.id } },
      // HasMany relation - nested create with neighbor collector
      optionValues: {
        create: await ArrayUtil.asyncMap(
          props.body.optionValues,
          (optionValue) =>
            EcommerceMallProductVariantOptionValueCollector.collect({
              body: optionValue,
              ecommerceMallProductVariants: { id: variantId } as IEntity,
              ecommerceMallSellers: props.ecommerceMallSellers,
              ecommerceMallSellerSessions: props.ecommerceMallSellerSessions,
            }),
        ),
      },
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
// ecommerceMallSellerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       sku_code: ...,
//       price: ...,
//       quantity: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       product: ...,
//       optionValues: ...,
//       inventoryRecords: ...,
//       cartItems: ...,
//       orderItems: ...,
//           } satisfies Prisma.ecommerce_mall_product_variantsCreateInput;
//         }
//       }
//--------------------------------------------------------------