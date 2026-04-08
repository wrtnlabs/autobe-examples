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

export namespace RedditPlatformMemberSessionTransformer {
  export type Payload = Prisma.reddit_platform_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reddit_platform_member_id: true,
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
      },
    } satisfies Prisma.reddit_platform_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformMemberSession> {
    return {
      id: input.id,
      redditPlatformMemberId: input.reddit_platform_member_id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? undefined,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      expiredAt: (
        input.expired_at ?? new Date("9999-12-31T23:59:59.999Z")
      ).toISOString(),
      revokedAt: input.revoked_at?.toISOString() ?? null,
      member: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IRedditPlatformMemberSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformMemberSessionTransformer {
//       export type Payload = Prisma.reddit_platform_member_sessionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             redditPlatformMemberId: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             createdAt: true,
//             updatedAt: true,
//             deletedAt: true,
//             expiredAt: true,
//             revokedAt: true,
//             ...
//           },
//         } satisfies Prisma.reddit_platform_member_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformMemberSession> {
//         return {
//   id: {string},
//   redditPlatformMemberId: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   expiredAt: {string},
//   revokedAt: {string | null},
//   member: {IRedditPlatformMember.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------