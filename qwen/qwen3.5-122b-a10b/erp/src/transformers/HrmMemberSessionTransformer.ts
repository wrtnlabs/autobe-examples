import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmMemberAtSummaryTransformer } from "./HrmMemberAtSummaryTransformer";

export namespace HrmMemberSessionTransformer {
  export type Payload = Prisma.hrm_member_sessionsGetPayload<
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
        member: HrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_member_sessionsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmMemberSession> {
    return {
      id: input.id,
      member: await HrmMemberAtSummaryTransformer.transform(input.member),
      ip: input.ip,
      href: input.href ?? null,
      referrer: input.referrer ?? null,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies IHrmMemberSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmMemberSessionTransformer {
//       export type Payload = Prisma.hrm_member_sessionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             access_token: true,
//             refresh_token: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             created_at: true,
//             expired_at: true,
//             member: HrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_member_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmMemberSession> {
//         return {
//   id: {string},
//   member: await HrmMemberAtSummaryTransformer.transform(input.member),
//   ip: {string},
//   href: {string | null},
//   referrer: {string | null},
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------