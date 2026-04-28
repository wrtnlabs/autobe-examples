import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommentAtSummaryTransformer } from "./REdditLikeCommunityCommentAtSummaryTransformer";
import { REdditLikeCommunityReportAtSummaryTransformer } from "./REdditLikeCommunityReportAtSummaryTransformer";

export namespace REdditLikeCommunityReportOnCommentTransformer {
  export type Payload =
    Prisma.reddit_like_community_report_on_commentsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report: REdditLikeCommunityReportAtSummaryTransformer.select(),
        comment: REdditLikeCommunityCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_report_on_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityReportOnComment> {
    return {
      id: input.id,
      report: await REdditLikeCommunityReportAtSummaryTransformer.transform(
        input.report,
      ),
      comment: await REdditLikeCommunityCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IREdditLikeCommunityReportOnComment;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityReportOnCommentTransformer {
//       export type Payload = Prisma.reddit_like_community_report_on_commentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             report: REdditLikeCommunityReportAtSummaryTransformer.select(),
//             comment: REdditLikeCommunityCommentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_report_on_commentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityReportOnComment> {
//         return {
//   id: {string},
//   report: await REdditLikeCommunityReportAtSummaryTransformer.transform(input.report),
//   comment: await REdditLikeCommunityCommentAtSummaryTransformer.transform(input.comment),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------