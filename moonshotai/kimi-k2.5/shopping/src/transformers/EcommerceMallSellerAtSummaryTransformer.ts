import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        approval_status: true,
        created_at: true,
        deleted_at: true,
        registrations: {
          select: {
            status: true,
            created_at: true,
          },
          orderBy: {
            created_at: "desc",
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller.ISummary> {
    return {
      id: input.id,
      email: input.email,
      approvalStatus:
        input.approval_status as IEcommerceMallSeller.ISummary["approvalStatus"],
      createdAt: input.created_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      registrationCount: input.registrations.length,
      latestRegistrationStatus: input.registrations[0]?.status ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerAtSummaryTransformer {
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
//           },
//         } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSeller.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   approvalStatus: {"pending" | "approved" | "rejected" | "suspended"},
//   createdAt: {string},
//   deletedAt: {string | null},
//   registrationCount: {integer},
//   latestRegistrationStatus: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------