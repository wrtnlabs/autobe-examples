import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppMemberTransformer {
  export type Payload = Prisma.todo_app_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            display_name: true,
          },
        } satisfies Prisma.todo_app_profilesFindManyArgs,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.todo_app_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppMember> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.profile?.display_name ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies ITodoAppMember;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace TodoAppMemberTransformer {
//       export type Payload = Prisma.todo_app_membersGetPayload<ReturnType<typeof select>>;
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
//           },
//         } satisfies Prisma.todo_app_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppMember> {
//         return {
//   id: {string},
//   email: {string},
//   display_name: {string | null},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------