import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
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

export namespace RedditCommunityCommentReportTransformer {
  export type Payload = Prisma.reddit_community_comment_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        comment: RedditCommunityCommentAtSummaryTransformer.select(),
        reporter: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_comment_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommentReport> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      comment: await RedditCommunityCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      reporter: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    } satisfies IRedditCommunityCommentReport;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityCommentReportTransformer {
//       export type Payload = Prisma.reddit_community_comment_reportsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             comment: RedditCommunityCommentAtSummaryTransformer.select(),
//             reporter: RedditCommunityMemberAtSummaryTransformer.select(),
//             community: RedditCommunityCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_community_comment_reportsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityCommentReport> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   comment: await RedditCommunityCommentAtSummaryTransformer.transform(input.comment),
//   reporter: await RedditCommunityMemberAtSummaryTransformer.transform(input.reporter),
//   community: await RedditCommunityCommunityAtSummaryTransformer.transform(input.community),
//         };
//       }
//     }
//--------------------------------------------------------------