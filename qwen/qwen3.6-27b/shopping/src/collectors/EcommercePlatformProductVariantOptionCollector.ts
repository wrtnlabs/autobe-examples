import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformProductVariantOptionCollector {
  export async function collect(props: {
    body: IEcommercePlatformProductVariantOption.ICreate;
    ecommercePlatformProducts: IEntity;
    ecommercePlatformProductVariants: IEntity;
  }) {
    const { attributeKey, attributeValue } = props.body;
    return {
      id: v4(),
      attribute_key: attributeKey,
      attribute_value: attributeValue,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      productVariant: {
        connect: { id: props.ecommercePlatformProductVariants.id },
      },
    } satisfies Prisma.ecommerce_platform_product_variant_optionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformProductVariantOptionCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformProductVariantOption.ICreate;
//           ecommercePlatformProducts: IEntity; // from path parameter productId
// ecommercePlatformProductVariants: IEntity; // from path parameter skuCode
//           
//           
//         }) {
//           return {
//       id: ...,
//       attribute_key: ...,
//       attribute_value: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       productVariant: ...,
//           } satisfies Prisma.ecommerce_platform_product_variant_optionsCreateInput;
//         }
//       }
//--------------------------------------------------------------