import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductVariantOptionValueCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariantOptionValue.ICreate;
    shoppingMallProductVariants: IEntity;
  }) {
    return {
      id: v4(),
      key: props.body.key,
      value: props.body.value,
      created_at: new Date(),
      updated_at: new Date(),
      variant: { connect: { id: props.shoppingMallProductVariants.id } },
    } satisfies Prisma.shopping_mall_product_variant_option_valuesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallProductVariantOptionValueCollector {
//         export async function collect(props: {
//           body: IShoppingMallProductVariantOptionValue.ICreate;
//           shoppingMallProductVariants: IEntity; // from path parameter variantId
//           
//           
//         }) {
//           return {
//       id: ...,
//       key: ...,
//       value: ...,
//       created_at: ...,
//       updated_at: ...,
//       variant: ...,
//           } satisfies Prisma.shopping_mall_product_variant_option_valuesCreateInput;
//         }
//       }
//--------------------------------------------------------------