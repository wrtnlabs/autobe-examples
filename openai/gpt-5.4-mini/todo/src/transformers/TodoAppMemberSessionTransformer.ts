import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppMemberSessionTransformer {
  export type Payload = Prisma.todo_app_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        member: {
          select: {},
        },
      },
    } satisfies Prisma.todo_app_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberSession> {
    return {
      id: input.id,
      member: {} satisfies ITodoAppMember.ISummary,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
    } satisfies ITodoAppMemberSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace TodoAppMemberSessionTransformer {
//       export type Payload = Prisma.todo_app_member_sessionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             created_at: true,
//             expired_at: true,
//             todo_app_member_id: true,
//             ...
//           },
//         } satisfies Prisma.todo_app_member_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ITodoAppMemberSession> {
//         return {
//   id: {string},
//   member: {ITodoAppMember.ISummary},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   createdAt: {string},
//   expiredAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------