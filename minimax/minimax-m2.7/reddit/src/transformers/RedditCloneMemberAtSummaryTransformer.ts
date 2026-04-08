import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        profile: true,
        karma: true,
        ownedCommunities: true,
        communityModerations: true,
        assignedCommunityModerators: true,
        communityBans: true,
        submittedReports: true,
        resolvedReports: true,
        subscriptions: true,
        posts: true,
        comments: true,
        postVotes: true,
        moderatorRoles: true,
        assignedModerators: true,
        moderatorSnapshots: true,
        assignedModeratorSnapshots: true,
        bansReceiveds: true,
        bansIssueds: true,
        reports: true,
        uploadedFiles: true,
      },
    } satisfies Prisma.reddit_clone_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneMember.ISummary> {
    return {
      id: input.id,
      username: input.username,
    } satisfies IRedditCloneMember.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneMemberAtSummaryTransformer {
//       export type Payload = Prisma.reddit_clone_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             username: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.reddit_clone_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneMember.ISummary> {
//         return {
//   id: {string},
//   username: {string},
//         };
//       }
//     }
//--------------------------------------------------------------