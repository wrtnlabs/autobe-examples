import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberTransformer } from "./RedditCloneMemberTransformer";

export namespace RedditCloneCommunityModeratorAtRecentPendingReportTransformer {
  export type Payload = Prisma.reddit_clone_community_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        target_id: true,
        reason: true,
        status: true,
        resolution_note: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        reporter: RedditCloneMemberTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityModerator.IRecentPendingReport> {
    return {
      id: input.id,
      targetType: input.target_type,
      targetId: input.target_id,
      reason: input.reason,
      status: input.status,
      createdAt: toISOStringSafe(input.created_at),
      reporter: await RedditCloneMemberTransformer.transform(input.reporter),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    } satisfies IRedditCloneCommunityModerator.IRecentPendingReport;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneCommunityModeratorAtRecentPendingReportTransformer {
//       export type Payload = Prisma.reddit_clone_community_reportsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             target_type: true,
//             target_id: true,
//             reason: true,
//             status: true,
//             resolution_note: true,
//             resolved_at: true,
//             created_at: true,
//             updated_at: true,
//             community: RedditCloneCommunityAtSummaryTransformer.select(),
//             reporter_id: true,
//             resolved_by_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_clone_community_reportsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneCommunityModerator.IRecentPendingReport> {
//         return {
//   id: {string},
//   targetType: {string},
//   targetId: {string},
//   reason: {string},
//   status: {string},
//   createdAt: {string},
//   reporter: {IRedditCloneMember},
//   community: await RedditCloneCommunityAtSummaryTransformer.transform(input.community),
//         };
//       }
//     }
//--------------------------------------------------------------