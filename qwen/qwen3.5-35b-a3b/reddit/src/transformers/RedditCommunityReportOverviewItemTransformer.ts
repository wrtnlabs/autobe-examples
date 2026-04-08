import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReportOverviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportOverviewItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommentAtSummaryTransformer } from "./RedditCommunityCommentAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityReportOverviewItemTransformer {
  export type Payload = Prisma.reddit_community_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporter: RedditCommunityMemberAtSummaryTransformer.select(),
        community: true,
        targetPost: RedditCommunityPostAtSummaryTransformer.select(),
        targetComment: RedditCommunityCommentAtSummaryTransformer.select(),
        resolution: {
          select: {},
        } satisfies Prisma.reddit_community_report_resolutionsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityReportOverviewItem> {
    const targetContent: IRedditCommunityReportOverviewItem["targetContent"] =
      input.targetPost
        ? await RedditCommunityPostAtSummaryTransformer.transform(
            input.targetPost,
          )
        : await RedditCommunityCommentAtSummaryTransformer.transform(
            input.targetComment!,
          );
    return {
      id: input.id,
      reason: input.reason,
      status_id: input.status_id,
      created_at: toISOStringSafe(input.created_at),
      reporter: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      targetContent,
    } satisfies IRedditCommunityReportOverviewItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityReportOverviewItemTransformer {
//       export type Payload = Prisma.reddit_community_reportsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status_id: true,
//             created_at: true,
//             ...
//           },
//         } satisfies Prisma.reddit_community_reportsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityReportOverviewItem> {
//         return {
//   id: {string},
//   reason: {string},
//   status_id: {integer},
//   created_at: {string},
//   reporter: {IRedditCommunityMember.ISummary},
//   targetContent: {IRedditCommunityPost.ISummary | IRedditCommunityComment.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------