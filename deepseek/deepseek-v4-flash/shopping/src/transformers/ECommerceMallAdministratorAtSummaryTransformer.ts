import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ECommerceMallAdministratorAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_administratorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        created_at: true,
        superAdministrator: {
          select: {
            id: true,
          },
        } satisfies Prisma.e_commerce_mall_super_administratorsFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallAdministrator.ISummary> {
    return {
      id: input.id,
      email: input.email,
      grade: input.superAdministrator !== null ? "super" : "regular",
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallAdministrator.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallAdministratorAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_administratorsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.e_commerce_mall_administratorsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallAdministrator.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   grade: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------