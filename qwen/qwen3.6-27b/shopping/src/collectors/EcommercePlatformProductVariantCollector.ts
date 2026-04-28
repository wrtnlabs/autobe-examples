import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { EcommercePlatformProductVariantOptionCollector } from "./EcommercePlatformProductVariantOptionCollector";

export namespace EcommercePlatformProductVariantCollector {
  export async function collect(props: {
    body: IEcommercePlatformProductVariant.ICreate;
    ecommercePlatformProducts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      sku_code: props.body.skuCode,
      price: props.body.price ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.ecommercePlatformProducts.id } },
      options: {
        create: await ArrayUtil.asyncMap(props.body.options, (option) =>
          EcommercePlatformProductVariantOptionCollector.collect({
            body: option,
            ecommercePlatformProducts: props.ecommercePlatformProducts,
            ecommercePlatformProductVariants: { id },
          }),
        ),
      },
    } satisfies Prisma.ecommerce_platform_product_variantsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformProductVariantCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformProductVariant.ICreate;
//           ecommercePlatformProducts: IEntity; // from path parameter productId
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
//       ecommercePlatformShoppingCartItems: ...,
//       orderItems: ...,
//       options: ...,
//       variantSnapshots: ...,
//           } satisfies Prisma.ecommerce_platform_product_variantsCreateInput;
//         }
//       }
//--------------------------------------------------------------