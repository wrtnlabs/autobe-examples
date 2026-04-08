import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerProfileAtSummaryTransformer {
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
        seller: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        snapshots: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_seller_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerProfile.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      logoUri: input.logo_uri,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommerceMallSellerProfile.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerProfileAtSummaryTransformer {
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
//             seller_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_seller_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerProfile.ISummary> {
//         return {
//   createdAt: {string},
//   description: {string},
//   id: {string},
//   logoUri: {null | string},
//   name: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------