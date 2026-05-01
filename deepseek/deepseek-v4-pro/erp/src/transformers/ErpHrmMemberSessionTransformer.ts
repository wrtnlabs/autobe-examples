import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";

export namespace ErpHrmMemberSessionTransformer {
  export type Payload = Prisma.erp_hrm_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_organization_id: true,
        access_token: true,
        refresh_token: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        member: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmMemberSession> {
    return {
      id: input.id,
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
      organization_id: input.erp_hrm_organization_id,
      access_token: input.access_token,
      refresh_token: input.refresh_token,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
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
//             erp_hrm_organization_id: true,
//             access_token: true,
//             refresh_token: true,
//             ip: true,
//             href: true,
//             referrer: true,
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
//   member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
//   organization_id: {string | null},
//   access_token: {string},
//   refresh_token: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------