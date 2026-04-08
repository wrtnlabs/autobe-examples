import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneModeratorSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_moderator_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        assigned_at: true,
        created_at: true,
        moderator: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_moderatorsFindManyArgs,
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        member: RedditCloneMemberAtSummaryTransformer.select(),
        assignedBy: RedditCloneMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_moderator_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModeratorSnapshot.ISummary> {
    return {
      id: input.id,
      role: input.role,
      assignedAt: input.assigned_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      assignedBy: await RedditCloneMemberAtSummaryTransformer.transform(
        input.assignedBy,
      ),
    } satisfies IRedditCloneModeratorSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneModeratorSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.reddit_clone_moderator_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             role: true,
//             assigned_at: true,
//             created_at: true,
//             reddit_clone_moderator_id: true,
//             community: RedditCloneCommunityAtSummaryTransformer.select(),
//             reddit_clone_member_id: true,
//             assigned_by_user_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_clone_moderator_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneModeratorSnapshot.ISummary> {
//         return {
//   id: {string},
//   role: {string},
//   assignedAt: {string},
//   createdAt: {string},
//   community: await RedditCloneCommunityAtSummaryTransformer.transform(input.community),
//   member: {IRedditCloneMember.ISummary},
//   assignedBy: {IRedditCloneMember.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------