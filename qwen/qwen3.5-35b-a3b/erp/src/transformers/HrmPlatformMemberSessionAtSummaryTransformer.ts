import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformMemberSessionAtSummaryTransformer {
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
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformMemberSession.ISummary> {
    return {
      id: input.id,
      ip_address: input.ip_address,
      user_agent: input.user_agent,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at?.toISOString() ?? null,
      organization: input.organization
        ? await HrmPlatformOrganizationAtSummaryTransformer.transform(
            input.organization,
          )
        : undefined,
    } satisfies IHrmPlatformMemberSession.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformMemberSessionAtSummaryTransformer {
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
//             organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_member_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformMemberSession.ISummary> {
//         return {
//   id: {string},
//   ip_address: {string},
//   user_agent: {string},
//   created_at: {string},
//   expired_at: {string | null},
//   organization: input.organization ? await HrmPlatformOrganizationAtSummaryTransformer.transform(input.organization) : null,
//         };
//       }
//     }
//--------------------------------------------------------------