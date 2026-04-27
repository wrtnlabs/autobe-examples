import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ECommerceMallAdministratorTransformer {
  export type Payload = Prisma.e_commerce_mall_administratorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        superAdministrator: {
          select: {
            id: true,
            deleted_at: true,
          },
        } satisfies Prisma.e_commerce_mall_super_administratorsFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallAdministrator> {
    return {
      id: input.id,
      email: input.email,
      grade:
        input.superAdministrator !== null &&
        input.superAdministrator.deleted_at === null
          ? "super"
          : "regular",
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallAdministrator;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallAdministratorTransformer {
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
//       export async function transform(input: Payload): Promise<IECommerceMallAdministrator> {
//         return {
//   id: {string},
//   email: {string},
//   grade: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------