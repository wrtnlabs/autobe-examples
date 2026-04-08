import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformMemberSessionTransformer {
  export type Payload = Prisma.hrm_platform_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        access_token_expires_at: true,
        refresh_token_expires_at: true,
        ip_address: true,
        user_agent: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        member: true,
        organization: true,
      },
    } satisfies Prisma.hrm_platform_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformMemberSession> {
    return {
      id: input.id,
      member_id: input.member.id,
      organization_id: input.organization?.id ?? null,
      access_token_expires_at: input.access_token_expires_at.toISOString(),
      refresh_token_expires_at: input.refresh_token_expires_at.toISOString(),
      ip_address: input.ip_address,
      user_agent: input.user_agent,
      referrer: input.referrer ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      expired_at: input.expired_at?.toISOString() ?? null,
    } satisfies IHrmPlatformMemberSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformMemberSessionTransformer {
//       export type Payload = Prisma.hrm_platform_member_sessionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             access_token: true,
//             refresh_token: true,
//             access_token_expires_at: true,
//             refresh_token_expires_at: true,
//             ip_address: true,
//             user_agent: true,
//             referrer: true,
//             created_at: true,
//             updated_at: true,
//             expired_at: true,
//             hrm_platform_member_id: true,
//             organization_id: true,
//           },
//         } satisfies Prisma.hrm_platform_member_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformMemberSession> {
//         return {
//   id: {string},
//   member_id: {string},
//   organization_id: {string | null},
//   access_token_expires_at: {string},
//   refresh_token_expires_at: {string},
//   ip_address: {string},
//   user_agent: {string},
//   referrer: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   expired_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------