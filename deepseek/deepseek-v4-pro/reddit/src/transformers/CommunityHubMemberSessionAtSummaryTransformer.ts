import { ICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityHubMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.community_hub_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        created_at: true,
        expired_at: true,
      },
    } satisfies Prisma.community_hub_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubMemberSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      active: input.expired_at > new Date(),
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies ICommunityHubMemberSession.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubMemberSessionAtSummaryTransformer {
//       export type Payload = Prisma.community_hub_member_sessionsGetPayload<ReturnType<typeof select>>;
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
//             community_hub_member_id: true,
//           },
//         } satisfies Prisma.community_hub_member_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubMemberSession.ISummary> {
//         return {
//   id: {string},
//   ip: {string},
//   active: {boolean},
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------