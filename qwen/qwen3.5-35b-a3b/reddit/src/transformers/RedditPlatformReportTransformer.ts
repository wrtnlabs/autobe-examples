import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberSessionAtSummaryTransformer } from "./RedditPlatformMemberSessionAtSummaryTransformer";

export namespace RedditPlatformReportTransformer {
  export type Payload = Prisma.reddit_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        reason: true,
        updated_at: true,
        deleted_at: true,
        target_type: true,
        target_id: true,
        reviewed_at: true,
        status: true,
        reportedBy: RedditPlatformMemberSessionAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
        reviewedBy: RedditPlatformMemberSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformReport> {
    return {
      id: input.id,
      reported_by:
        await RedditPlatformMemberSessionAtSummaryTransformer.transform(
          input.reportedBy,
        ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      reviewed_by: input.reviewedBy
        ? await RedditPlatformMemberSessionAtSummaryTransformer.transform(
            input.reviewedBy,
          )
        : null,
      created_at: input.created_at.toISOString(),
      reason: input.reason,
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      target_type: input.target_type,
      target_id: input.target_id,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      status: input.status,
    } satisfies IRedditPlatformReport;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformReportTransformer {
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
//       export async function transform(input: Payload): Promise<IRedditPlatformReport> {
//         return {
//   id: {string},
//   reported_by: {IRedditPlatformMemberSession.ISummary},
//   community: await RedditPlatformCommunityAtSummaryTransformer.transform(input.community),
//   reviewed_by: {IRedditPlatformMemberSession.ISummary | null},
//   created_at: {string},
//   reason: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   target_type: {string},
//   target_id: {integer},
//   reviewed_at: {string | null},
//   status: {string},
//         };
//       }
//     }
//--------------------------------------------------------------