import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCustomerAtSummaryTransformer } from "./MallPlatformCustomerAtSummaryTransformer";

export namespace MallPlatformShoppingCartAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_shopping_cartsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: MallPlatformCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_shopping_cartsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformShoppingCart.ISummary> {
    return {
      id: input.id,
      customer: await MallPlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformShoppingCart.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformShoppingCartAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_shopping_cartsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: MallPlatformCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_shopping_cartsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformShoppingCart.ISummary> {
//         return {
//   id: {string},
//   customer: await MallPlatformCustomerAtSummaryTransformer.transform(input.customer),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------