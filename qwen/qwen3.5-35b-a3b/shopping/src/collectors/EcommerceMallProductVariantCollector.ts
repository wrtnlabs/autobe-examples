import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallProductVariantCollector {
  export async function collect(props: {
    body: IEcommerceMallProductVariant.ICreate;
    ecommerceMallProducts: IEntity;
    ecommerceMallSellers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      sku_code: props.body.sku_code,
      option_values: props.body.option_values,
      price: props.body.price ?? null,
      stock_quantity: props.body.stock_quantity,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.ecommerceMallProducts.id } },
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
//       option_values: ...,
//       price: ...,
//       stock_quantity: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       product: ...,
//       inventoryRecords: ...,
//       orderItems: ...,
//       snapshots: ...,
//       snapshotHistories: ...,
//           } satisfies Prisma.ecommerce_mall_product_variantsCreateInput;
//         }
//       }
//--------------------------------------------------------------