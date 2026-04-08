import { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSuperAdministratorAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_super_administratorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        banned_at: true,
      },
    } satisfies Prisma.ecommerce_mall_super_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSuperAdministrator.ISummary> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      banned_at: input.banned_at?.toISOString() ?? null,
    } satisfies IEcommerceMallSuperAdministrator.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSuperAdministratorAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_super_administratorsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             display_name: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             banned_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_super_administratorsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSuperAdministrator.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   display_name: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   banned_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------