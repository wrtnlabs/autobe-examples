import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { IMallPlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductVariantAtSummaryTransformer } from "./MallPlatformProductVariantAtSummaryTransformer";
import { MallPlatformShoppingCartAtSummaryTransformer } from "./MallPlatformShoppingCartAtSummaryTransformer";

export namespace MallPlatformShoppingCartItemTransformer {
  export type Payload = Prisma.mall_platform_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        availability_state: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shoppingCart: MallPlatformShoppingCartAtSummaryTransformer.select(),
        productVariant: MallPlatformProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformShoppingCartItem> {
    return {
      id: input.id,
      shoppingCart:
        await MallPlatformShoppingCartAtSummaryTransformer.transform(
          input.shoppingCart,
        ),
      productVariant:
        await MallPlatformProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      quantity: input.quantity,
      availabilityState: input.availability_state,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformShoppingCartItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformShoppingCartItemTransformer {
//       export type Payload = Prisma.mall_platform_cart_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             availability_state: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             shoppingCart: MallPlatformShoppingCartAtSummaryTransformer.select(),
//             productVariant: MallPlatformProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_cart_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformShoppingCartItem> {
//         return {
//   id: {string},
//   shoppingCart: await MallPlatformShoppingCartAtSummaryTransformer.transform(input.shoppingCart),
//   productVariant: await MallPlatformProductVariantAtSummaryTransformer.transform(input.productVariant),
//   quantity: {integer},
//   availabilityState: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------