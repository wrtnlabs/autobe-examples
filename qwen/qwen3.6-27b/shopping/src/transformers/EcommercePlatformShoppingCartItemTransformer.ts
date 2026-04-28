import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformCustomerAtSummaryTransformer } from "./EcommercePlatformCustomerAtSummaryTransformer";
import { EcommercePlatformProductVariantAtSummaryTransformer } from "./EcommercePlatformProductVariantAtSummaryTransformer";

export namespace EcommercePlatformShoppingCartItemTransformer {
  export type Payload = Prisma.ecommerce_platform_shopping_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ecommercePlatformCustomer:
          EcommercePlatformCustomerAtSummaryTransformer.select(),
        ecommercePlatformProductVariant:
          EcommercePlatformProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_shopping_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformShoppingCartItem> {
    return {
      id: input.id,
      quantity: input.quantity,
      customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(
        input.ecommercePlatformCustomer,
      ),
      productVariant:
        await EcommercePlatformProductVariantAtSummaryTransformer.transform(
          input.ecommercePlatformProductVariant,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformShoppingCartItemTransformer {
//       export type Payload = Prisma.ecommerce_platform_shopping_cart_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ecommercePlatformCustomer: EcommercePlatformCustomerAtSummaryTransformer.select(),
//             ecommercePlatformProductVariant: EcommercePlatformProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_shopping_cart_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformShoppingCartItem> {
//         return {
//   id: {string},
//   quantity: {integer},
//   customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(input.ecommercePlatformCustomer),
//   productVariant: await EcommercePlatformProductVariantAtSummaryTransformer.transform(input.ecommercePlatformProductVariant),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------