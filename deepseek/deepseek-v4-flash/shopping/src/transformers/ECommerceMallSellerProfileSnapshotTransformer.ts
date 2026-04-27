import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallSellerProfileAtSummaryTransformer } from "./ECommerceMallSellerProfileAtSummaryTransformer";

export namespace ECommerceMallSellerProfileSnapshotTransformer {
  export type Payload =
    Prisma.e_commerce_mall_seller_profile_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        created_at: true,
        sellerProfile: ECommerceMallSellerProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_seller_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallSellerProfileSnapshot> {
    return {
      id: input.id,
      sellerProfile:
        await ECommerceMallSellerProfileAtSummaryTransformer.transform(
          input.sellerProfile,
        ),
      name: input.name,
      description: input.description,
      logo: input.logo,
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallSellerProfileSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallSellerProfileSnapshotTransformer {
//       export type Payload = Prisma.e_commerce_mall_seller_profile_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             logo: true,
//             created_at: true,
//             sellerProfile: ECommerceMallSellerProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_seller_profile_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallSellerProfileSnapshot> {
//         return {
//   id: {string},
//   sellerProfile: await ECommerceMallSellerProfileAtSummaryTransformer.transform(input.sellerProfile),
//   name: {string},
//   description: {string},
//   logo: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------