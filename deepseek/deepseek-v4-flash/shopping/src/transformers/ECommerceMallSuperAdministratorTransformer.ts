import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallAdministratorAtSummaryTransformer } from "./ECommerceMallAdministratorAtSummaryTransformer";

export namespace ECommerceMallSuperAdministratorTransformer {
  export type Payload = Prisma.e_commerce_mall_super_administratorsGetPayload<
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
        administrator: ECommerceMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_super_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallSuperAdministrator> {
    return {
      id: input.id,
      administrator:
        await ECommerceMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallSuperAdministrator;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallSuperAdministratorTransformer {
//       export type Payload = Prisma.e_commerce_mall_super_administratorsGetPayload<ReturnType<typeof select>>;
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
//             administrator: ECommerceMallAdministratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_super_administratorsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallSuperAdministrator> {
//         return {
//   id: {string},
//   administrator: await ECommerceMallAdministratorAtSummaryTransformer.transform(input.administrator),
//   email: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------