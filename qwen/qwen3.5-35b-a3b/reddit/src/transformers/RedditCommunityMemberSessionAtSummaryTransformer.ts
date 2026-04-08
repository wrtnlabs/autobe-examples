import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        member: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_membersFindManyArgs,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_community_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityMemberSession.ISummary> {
    return {
      id: input.id,
      redditCommunityMemberId: input.member.id,
      ip: input.ip ?? null,
      href: input.href ?? null,
      referrer: input.referrer ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
    } satisfies IRedditCommunityMemberSession.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityMemberSessionAtSummaryTransformer {
//       export type Payload = Prisma.reddit_community_member_sessionsGetPayload<ReturnType<typeof select>>;
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
//             expired_at: true,
//             deleted_at: true,
//             reddit_community_member_id: true,
//           },
//         } satisfies Prisma.reddit_community_member_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityMemberSession.ISummary> {
//         return {
//   id: {string},
//   redditCommunityMemberId: {string},
//   ip: {string | null},
//   href: {string | null},
//   referrer: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   expiredAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------