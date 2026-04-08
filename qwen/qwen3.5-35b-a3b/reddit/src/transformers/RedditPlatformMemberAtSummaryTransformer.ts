import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        ownedCommunities: true,
        communityMemberships: true,
        bannedUserRecords: true,
        issuedBannedUserRecords: true,
        subscriptions: true,
        posts: true,
        comments: true,
        postVotes: true,
        commentVotes: true,
        banRecords: true,
        issuedBanRecords: true,
        banRecordSnapshots: true,
        banRecordSnapshotsIssueds: true,
      },
    } satisfies Prisma.reddit_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformMember.ISummary> {
    return {
      id: input.id,
      username: input.username,
      karma: input.karma,
      created_at: input.created_at.toISOString(),
    } satisfies IRedditPlatformMember.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformMemberAtSummaryTransformer {
//       export type Payload = Prisma.reddit_platform_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             username: true,
//             karma: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.reddit_platform_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformMember.ISummary> {
//         return {
//   id: {string},
//   username: {string},
//   karma: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------