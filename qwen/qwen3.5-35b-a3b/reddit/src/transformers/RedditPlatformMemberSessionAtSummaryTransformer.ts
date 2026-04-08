import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_member_sessionsGetPayload<
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
        updated_at: true,
        deleted_at: true,
        expired_at: true,
        revoked_at: true,
        token: true,
        refresh_token: true,
        member: RedditPlatformMemberAtSummaryTransformer.select(),
        reportsSubmitteds: { select: { id: true } },
        reportsRevieweds: { select: { id: true } },
      },
    } satisfies Prisma.reddit_platform_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformMemberSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? undefined,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      revoked_at: input.revoked_at?.toISOString() ?? undefined,
      member: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IRedditPlatformMemberSession.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformMemberSessionAtSummaryTransformer {
//       export type Payload = Prisma.reddit_platform_member_sessionsGetPayload<ReturnType<typeof select>>;
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
//             updated_at: true,
//             deleted_at: true,
//             expired_at: true,
//             revoked_at: true,
//             token: true,
//             refresh_token: true,
//             member: RedditPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_platform_member_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformMemberSession.ISummary> {
//         return {
//   id: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string | null},
//   created_at: {string},
//   expired_at: {string},
//   revoked_at: {string | null},
//   member: await RedditPlatformMemberAtSummaryTransformer.transform(input.member),
//         };
//       }
//     }
//--------------------------------------------------------------