import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallProductVariantOptionValueCollector {
  export async function collect(props: {
    body: IEcommerceMallProductVariantOptionValue.ICreate;
    ecommerceMallProductVariants: IEntity;
    ecommerceMallSellers: IEntity;
    ecommerceMallSellerSessions: IEntity;
  }) {
    return {
      id: v4(),
      key: props.body.key,
      value: props.body.value,
      created_at: new Date(),
      updated_at: new Date(),
      productVariant: {
        connect: { id: props.ecommerceMallProductVariants.id },
      },
    } satisfies Prisma.ecommerce_mall_product_variant_option_valuesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallProductVariantOptionValueCollector {
//         export async function collect(props: {
//           body: IEcommerceMallProductVariantOptionValue.ICreate;
//           ecommerceMallProductVariants: IEntity; // from path parameter variantId
// ecommerceMallSellers: IEntity; // from authorized actor
// ecommerceMallSellerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       key: ...,
//       value: ...,
//       created_at: ...,
//       updated_at: ...,
//       productVariant: ...,
//           } satisfies Prisma.ecommerce_mall_product_variant_option_valuesCreateInput;
//         }
//       }
//--------------------------------------------------------------