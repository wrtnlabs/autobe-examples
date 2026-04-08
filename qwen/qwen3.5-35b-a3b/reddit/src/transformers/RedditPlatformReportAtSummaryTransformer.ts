import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformReportAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        created_at: true,
        reviewed_at: true,
        target_type: true,
        target_id: true,
        reportedBy: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
        updated_at: true,
        deleted_at: true,
        reviewedBy: true,
      },
    } satisfies Prisma.reddit_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformReport.ISummary> {
    return {
      id: input.id,
      status: input.status,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      reported_by: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.reportedBy,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      target_type: input.target_type,
      target_id: input.target_id.toString(),
    } satisfies IRedditPlatformReport.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformReportAtSummaryTransformer {
//       export type Payload = Prisma.reddit_platform_reportsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             reason: true,
//             updated_at: true,
//             deleted_at: true,
//             target_type: true,
//             target_id: true,
//             reviewed_at: true,
//             status: true,
//             reported_by: true,
//             community: RedditPlatformCommunityAtSummaryTransformer.select(),
//             reviewed_by: true,
//             ...
//           },
//         } satisfies Prisma.reddit_platform_reportsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformReport.ISummary> {
//         return {
//   id: {string},
//   status: {string},
//   reason: {string},
//   created_at: {string},
//   reviewed_at: {string | null},
//   reported_by: {IRedditPlatformMember.ISummary},
//   community: await RedditPlatformCommunityAtSummaryTransformer.transform(input.community),
//   target_type: {string},
//   target_id: {string},
//         };
//       }
//     }
//--------------------------------------------------------------