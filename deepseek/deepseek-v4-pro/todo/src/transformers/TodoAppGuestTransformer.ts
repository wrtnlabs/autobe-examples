import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppGuestTransformer {
  export type Payload = Prisma.todo_app_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        fingerprint: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.todo_app_guestsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppGuest> {
    return {
      id: input.id,
      fingerprint: input.fingerprint,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies ITodoAppGuest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace TodoAppGuestTransformer {
//       export type Payload = Prisma.todo_app_guestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             fingerprint: true,
//             created_at: true,
//             updated_at: true,
//           },
//         } satisfies Prisma.todo_app_guestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppGuest> {
//         return {
//   id: {string},
//   fingerprint: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------