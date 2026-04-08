import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommentAtSummaryTransformer } from "./RedditCommunityCommentAtSummaryTransformer";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityReportTransformer {
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
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        targetPost: RedditCommunityPostAtSummaryTransformer.select(),
        targetComment: RedditCommunityCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityReport> {
    return {
      id: input.id,
      reporter: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      targetPost: input.targetPost
        ? await RedditCommunityPostAtSummaryTransformer.transform(
            input.targetPost,
          )
        : null,
      targetComment: input.targetComment
        ? await RedditCommunityCommentAtSummaryTransformer.transform(
            input.targetComment,
          )
        : null,
      reason: input.reason,
      status_id: input.status_id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditCommunityReport;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityReportTransformer {
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
//             updated_at: true,
//             deleted_at: true,
//             reporter: RedditCommunityMemberAtSummaryTransformer.select(),
//             community: RedditCommunityCommunityAtSummaryTransformer.select(),
//             targetPost: RedditCommunityPostAtSummaryTransformer.select(),
//             targetComment: RedditCommunityCommentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_community_reportsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityReport> {
//         return {
//   id: {string},
//   reporter: await RedditCommunityMemberAtSummaryTransformer.transform(input.reporter),
//   community: await RedditCommunityCommunityAtSummaryTransformer.transform(input.community),
//   targetPost: input.targetPost ? await RedditCommunityPostAtSummaryTransformer.transform(input.targetPost) : null,
//   targetComment: input.targetComment ? await RedditCommunityCommentAtSummaryTransformer.transform(input.targetComment) : null,
//   reason: {string},
//   status_id: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------