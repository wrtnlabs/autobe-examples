import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallSellerProfileTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_seller_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerProfile> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      logo_uri: input.logo_uri ?? undefined,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallSellerProfile;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerProfileTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             logo_uri: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerProfile> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   logo_uri: {string | null},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {null | string},
//         };
//       }
//     }
//--------------------------------------------------------------