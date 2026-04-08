import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerRegistrationAtSummaryTransformer } from "./EcommerceMallSellerRegistrationAtSummaryTransformer";

export namespace EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_seller_registration_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        registration:
          EcommerceMallSellerRegistrationAtSummaryTransformer.select(),
        reviewer: true,
      },
    } satisfies Prisma.ecommerce_mall_seller_registration_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerRegistrationSnapshot.ISummary> {
    return {
      id: input.id,
      status: input.registration.status as "pending" | "approved" | "rejected",
      rejectionReason: input.registration.rejection_reason ?? null,
      createdAt: input.created_at.toISOString(),
      sellerRegistration:
        await EcommerceMallSellerRegistrationAtSummaryTransformer.transform(
          input.registration,
        ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_registration_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             registration: EcommerceMallSellerRegistrationAtSummaryTransformer.select(),
//             ecommerce_mall_admin_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_seller_registration_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerRegistrationSnapshot.ISummary> {
//         return {
//   id: {string},
//   status: {"pending" | "approved" | "rejected"},
//   rejectionReason: {string | null},
//   createdAt: {string},
//   sellerRegistration: await EcommerceMallSellerRegistrationAtSummaryTransformer.transform(input.registration),
//         };
//       }
//     }
//--------------------------------------------------------------