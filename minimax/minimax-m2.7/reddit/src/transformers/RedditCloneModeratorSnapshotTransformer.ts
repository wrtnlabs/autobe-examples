import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneCommunityModeratorAtSummaryTransformer } from "./RedditCloneCommunityModeratorAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneModeratorSnapshotTransformer {
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
        moderator: RedditCloneCommunityModeratorAtSummaryTransformer.select(),
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        member: RedditCloneMemberAtSummaryTransformer.select(),
        assignedBy: RedditCloneMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_moderator_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModeratorSnapshot> {
    return {
      id: input.id,
      redditCloneModeratorId: input.moderator.id,
      redditCloneCommunityId: input.community.id,
      redditCloneMemberId: input.member.id,
      assignedByUserId: input.assignedBy.id,
      role: input.role,
      assignedAt: toISOStringSafe(input.assigned_at),
      createdAt: toISOStringSafe(input.created_at),
      moderator:
        await RedditCloneCommunityModeratorAtSummaryTransformer.transform(
          input.moderator,
        ),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      assignedBy: await RedditCloneMemberAtSummaryTransformer.transform(
        input.assignedBy,
      ),
    } satisfies IRedditCloneModeratorSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneModeratorSnapshotTransformer {
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
//       export async function transform(input: Payload): Promise<IRedditCloneModeratorSnapshot> {
//         return {
//   id: {string},
//   redditCloneModeratorId: {string},
//   redditCloneCommunityId: {string},
//   redditCloneMemberId: {string},
//   assignedByUserId: {string},
//   role: {string},
//   assignedAt: {string},
//   createdAt: {string},
//   moderator: {IRedditCloneCommunityModerator.ISummary},
//   community: await RedditCloneCommunityAtSummaryTransformer.transform(input.community),
//   member: {IRedditCloneMember.ISummary},
//   assignedBy: {IRedditCloneMember.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------