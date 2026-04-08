import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppProfileTransformer {
  export type Payload = Prisma.todo_app_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    } satisfies Prisma.todo_app_profilesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppProfile> {
    return {
      id: input.id,
      display_name: input.display_name,
      member: {} as ITodoAppMember.ISummary,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies ITodoAppProfile;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace TodoAppProfileTransformer {
//       export type Payload = Prisma.todo_app_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             display_name: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             todo_app_member_id: true,
//             ...
//           },
//         } satisfies Prisma.todo_app_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppProfile> {
//         return {
//   id: {string},
//   display_name: {string},
//   member: {ITodoAppMember.ISummary},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------