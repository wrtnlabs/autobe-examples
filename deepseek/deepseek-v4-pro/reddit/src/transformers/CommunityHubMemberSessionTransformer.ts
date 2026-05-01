import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityHubMemberAtSummaryTransformer } from "./CommunityHubMemberAtSummaryTransformer";

export namespace CommunityHubMemberSessionTransformer {
  export type Payload = Prisma.community_hub_member_sessionsGetPayload<
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
        member: CommunityHubMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_hub_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubMemberSession> {
    return {
      id: input.id,
      member: await CommunityHubMemberAtSummaryTransformer.transform(
        input.member,
      ),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies ICommunityHubMemberSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubMemberSessionTransformer {
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
//             member: CommunityHubMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_hub_member_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubMemberSession> {
//         return {
//   id: {string},
//   member: await CommunityHubMemberAtSummaryTransformer.transform(input.member),
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------