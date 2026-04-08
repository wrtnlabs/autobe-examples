import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductVariantCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariant.ICreate;
    shoppingMallProducts: IEntity;
  }) {
    const variantOptionsData = props.body.variantOptions.map((option) => ({
      id: v4(),
      key: option.key,
      value: option.value,
      created_at: new Date(),
      updated_at: new Date(),
    }));
    const initialStockQuantity: number = props.body.initialStockQuantity ?? 0;
    return {
      id: v4(),
      sku_code: props.body.sku_code,
      price: props.body.price ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.shoppingMallProducts.id } },
      variantOptions: {
        create: variantOptionsData,
      },
      inventoryRecords:
        initialStockQuantity > 0
          ? {
              create: [
                {
                  id: v4(),
                  quantity_change: initialStockQuantity,
                  reason: "Initial stock",
                  created_at: new Date(),
                  updated_at: new Date(),
                  deleted_at: null,
                },
              ],
            }
          : undefined,
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
//       cartItems: ...,
//       inventoryRecords: ...,
//       variantSnapshots: ...,
//       variantOptions: ...,
//       orderItems: ...,
//           } satisfies Prisma.shopping_mall_product_variantsCreateInput;
//         }
//       }
//--------------------------------------------------------------