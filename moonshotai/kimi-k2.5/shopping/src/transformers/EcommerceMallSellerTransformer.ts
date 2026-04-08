import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerProfileSnapshotAtSummaryTransformer } from "./EcommerceMallSellerProfileSnapshotAtSummaryTransformer";

export namespace EcommerceMallSellerTransformer {
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        approval_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profileSnapshots:
          EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller> {
    const latestProfile =
      input.profileSnapshots.length > 0
        ? input.profileSnapshots.reduce((latest, current) =>
            current.created_at > latest.created_at ? current : latest,
          )
        : null;
    return {
      id: input.id,
      email: input.email,
      approvalStatus: input.approval_status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      profile: latestProfile
        ? await EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform(
            latestProfile,
          )
        : null,
    } satisfies IEcommerceMallSeller;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerTransformer {
//       export type Payload = Prisma.ecommerce_mall_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             approval_status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             profileSnapshots: EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSeller> {
//         return {
//   id: {string},
//   email: {string},
//   approvalStatus: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   profile: input.profileSnapshots ? await EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform(input.profileSnapshots) : null,
//         };
//       }
//     }
//--------------------------------------------------------------