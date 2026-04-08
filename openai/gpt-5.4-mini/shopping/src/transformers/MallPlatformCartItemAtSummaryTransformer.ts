import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductVariantAtSummaryTransformer } from "./MallPlatformProductVariantAtSummaryTransformer";
import { MallPlatformShoppingCartAtSummaryTransformer } from "./MallPlatformShoppingCartAtSummaryTransformer";

export namespace MallPlatformCartItemAtSummaryTransformer {
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
  ): Promise<IMallPlatformCartItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      availabilityState: input.availability_state,
      shoppingCart:
        await MallPlatformShoppingCartAtSummaryTransformer.transform(
          input.shoppingCart,
        ),
      productVariant:
        await MallPlatformProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformCartItem.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformCartItemAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IMallPlatformCartItem.ISummary> {
//         return {
//   id: {string},
//   quantity: {integer},
//   availabilityState: {string},
//   shoppingCart: await MallPlatformShoppingCartAtSummaryTransformer.transform(input.shoppingCart),
//   productVariant: await MallPlatformProductVariantAtSummaryTransformer.transform(input.productVariant),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------