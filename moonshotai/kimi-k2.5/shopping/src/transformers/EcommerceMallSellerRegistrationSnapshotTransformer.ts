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
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallSellerRegistrationAtSummaryTransformer } from "./EcommerceMallSellerRegistrationAtSummaryTransformer";

export namespace EcommerceMallSellerRegistrationSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_seller_registration_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        ecommerce_mall_seller_registration_id: true,
        ecommerce_mall_admin_id: true,
        registration:
          EcommerceMallSellerRegistrationAtSummaryTransformer.select(),
        reviewer: EcommerceMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_registration_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerRegistrationSnapshot> {
    return {
      id: input.id,
      ecommerceMallSellerRegistrationId:
        input.ecommerce_mall_seller_registration_id,
      ecommerceMallAdminId: input.ecommerce_mall_admin_id ?? null,
      registration:
        await EcommerceMallSellerRegistrationAtSummaryTransformer.transform(
          input.registration,
        ),
      reviewer: input.reviewer
        ? await EcommerceMallAdminAtSummaryTransformer.transform(input.reviewer)
        : null,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommerceMallSellerRegistrationSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerRegistrationSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_registration_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             registration: EcommerceMallSellerRegistrationAtSummaryTransformer.select(),
//             reviewer: EcommerceMallAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_registration_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerRegistrationSnapshot> {
//         return {
//   id: {string},
//   ecommerceMallSellerRegistrationId: {string},
//   ecommerceMallAdminId: {string | null},
//   registration: await EcommerceMallSellerRegistrationAtSummaryTransformer.transform(input.registration),
//   reviewer: input.reviewer ? await EcommerceMallAdminAtSummaryTransformer.transform(input.reviewer) : null,
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------