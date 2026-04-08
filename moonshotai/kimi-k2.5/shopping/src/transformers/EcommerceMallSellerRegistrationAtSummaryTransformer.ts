import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallSellerRegistrationAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_registrationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        rejection_reason: true,
        created_at: true,
        reviewed_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        reviewer: EcommerceMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_registrationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerRegistration.ISummary> {
    return {
      id: input.id,
      status: input.status,
      rejectionReason: input.rejection_reason ?? null,
      createdAt: input.created_at.toISOString(),
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      reviewer: input.reviewer
        ? await EcommerceMallAdminAtSummaryTransformer.transform(input.reviewer)
        : null,
    } satisfies IEcommerceMallSellerRegistration.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerRegistrationAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_registrationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             reviewed_at: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             reviewer: EcommerceMallAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_registrationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerRegistration.ISummary> {
//         return {
//   id: {string},
//   status: {string},
//   rejectionReason: {string | null},
//   createdAt: {string},
//   reviewedAt: {string | null},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   reviewer: input.reviewer ? await EcommerceMallAdminAtSummaryTransformer.transform(input.reviewer) : null,
//         };
//       }
//     }
//--------------------------------------------------------------