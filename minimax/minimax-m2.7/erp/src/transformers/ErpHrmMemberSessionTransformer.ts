import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";

export namespace ErpHrmMemberSessionTransformer {
  // 1. Payload type first
  export type Payload = Prisma.erp_hrm_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        access_token: true,
        refresh_token: true,
        token_expired_at: true,
        created_at: true,
        expired_at: true,
        member: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_member_sessionsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmMemberSession> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      tokenExpiredAt: input.token_expired_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
    } satisfies IErpHrmMemberSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmMemberSessionTransformer {
//       export type Payload = Prisma.erp_hrm_member_sessionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             access_token: true,
//             refresh_token: true,
//             token_expired_at: true,
//             created_at: true,
//             expired_at: true,
//             member: ErpHrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_member_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmMemberSession> {
//         return {
//   id: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   tokenExpiredAt: {string},
//   createdAt: {string},
//   expiredAt: {string},
//   member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
//         };
//       }
//     }
//--------------------------------------------------------------