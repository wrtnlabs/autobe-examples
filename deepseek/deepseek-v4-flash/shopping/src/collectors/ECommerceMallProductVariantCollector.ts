import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ECommerceMallProductVariantCollector {
  export async function collect(props: {
    body: IECommerceMallProductVariant.ICreate;
    eCommerceMallProducts: IEntity;
    eCommerceMallSellers: IEntity;
    eCommerceMallSellerSessions: IEntity;
  }) {
    return {
      id: v4(),
      sku_code: props.body.sku_code,
      price: props.body.price ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.eCommerceMallProducts.id } },
      options: props.body.options.length
        ? {
            create: props.body.options.map((option) => ({
              id: v4(),
              key: option.key,
              value: option.value,
              created_at: new Date(),
              updated_at: new Date(),
            })),
          }
        : undefined,
    } satisfies Prisma.e_commerce_mall_product_variantsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ECommerceMallProductVariantCollector {
//         export async function collect(props: {
//           body: IECommerceMallProductVariant.ICreate;
//           eCommerceMallProducts: IEntity; // from path parameter productId
// eCommerceMallSellers: IEntity; // from authorized actor
// eCommerceMallSellerSessions: IEntity; // from authorized session
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
//       inventoryRecords: ...,
//       options: ...,
//       cartItems: ...,
//       orderItems: ...,
//           } satisfies Prisma.e_commerce_mall_product_variantsCreateInput;
//         }
//       }
//--------------------------------------------------------------