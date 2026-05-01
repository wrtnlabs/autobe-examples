import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ShoppingMallProductVariantOptionValueCollector } from "./ShoppingMallProductVariantOptionValueCollector";

export namespace ShoppingMallProductVariantCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariant.ICreate;
    product: IEntity;
    seller: IEntity;
    session: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      code: props.body.code,
      price: props.body.price ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.product.id } },
      snapshots: undefined,
      inventoryRecords: undefined,
      optionValues: {
        create: await ArrayUtil.asyncMap(props.body.optionValues, (ov) =>
          ShoppingMallProductVariantOptionValueCollector.collect({
            body: ov,
            shoppingMallProductVariants: { id },
          }),
        ),
      },
      cartItems: undefined,
      orderItems: undefined,
    } satisfies Prisma.shopping_mall_product_variantsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallProductVariantCollector {
//         export async function collect(props: {
//           body: IShoppingMallProductVariant.ICreate;
//           shoppingMallProducts: IEntity; // from path parameter productId
// shoppingMallSellers: IEntity; // from authorized actor
// shoppingMallSellerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       code: ...,
//       price: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       product: ...,
//       snapshots: ...,
//       inventoryRecords: ...,
//       optionValues: ...,
//       cartItems: ...,
//       orderItems: ...,
//           } satisfies Prisma.shopping_mall_product_variantsCreateInput;
//         }
//       }
//--------------------------------------------------------------