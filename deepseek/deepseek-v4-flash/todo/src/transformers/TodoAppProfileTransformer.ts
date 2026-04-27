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
import { TodoAppMemberAtSummaryTransformer } from "./TodoAppMemberAtSummaryTransformer";

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
        member: TodoAppMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_profilesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppProfile> {
    return {
      id: input.id,
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
      displayName: input.display_name ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
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
//             member: TodoAppMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.todo_app_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppProfile> {
//         return {
//   id: {string},
//   member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
//   displayName: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------