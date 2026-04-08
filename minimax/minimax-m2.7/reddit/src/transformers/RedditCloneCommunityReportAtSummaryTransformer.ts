import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneCommunityReportAtSummaryTransformer {
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
        reporter: RedditCloneMemberAtSummaryTransformer.select(),
        resolvedBy: true,
      },
    } satisfies Prisma.reddit_clone_community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityReport.ISummary> {
    return {
      id: input.id,
      targetType: input.target_type as "post" | "comment",
      targetId: input.target_id,
      status: input.status as "pending" | "approved" | "dismissed",
      createdAt: input.created_at.toISOString(),
      reporter: await RedditCloneMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    } satisfies IRedditCloneCommunityReport.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneCommunityReportAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IRedditCloneCommunityReport.ISummary> {
//         return {
//   id: {string},
//   targetType: {"post" | "comment"},
//   targetId: {string},
//   status: {"pending" | "approved" | "dismissed"},
//   createdAt: {string},
//   reporter: {IRedditCloneMember.ISummary},
//   community: await RedditCloneCommunityAtSummaryTransformer.transform(input.community),
//         };
//       }
//     }
//--------------------------------------------------------------