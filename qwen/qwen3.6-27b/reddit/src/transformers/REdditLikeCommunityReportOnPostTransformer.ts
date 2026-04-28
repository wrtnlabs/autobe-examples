import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityPostAtSummaryTransformer } from "./REdditLikeCommunityPostAtSummaryTransformer";
import { REdditLikeCommunityReportAtSummaryTransformer } from "./REdditLikeCommunityReportAtSummaryTransformer";

export namespace REdditLikeCommunityReportOnPostTransformer {
  export type Payload = Prisma.reddit_like_community_report_on_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        report: REdditLikeCommunityReportAtSummaryTransformer.select(),
        post: REdditLikeCommunityPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_report_on_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityReportOnPost> {
    return {
      id: input.id,
      report: await REdditLikeCommunityReportAtSummaryTransformer.transform(
        input.report,
      ),
      post: await REdditLikeCommunityPostAtSummaryTransformer.transform(
        input.post,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityReportOnPostTransformer {
//       export type Payload = Prisma.reddit_like_community_report_on_postsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             report: REdditLikeCommunityReportAtSummaryTransformer.select(),
//             post: REdditLikeCommunityPostAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_report_on_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityReportOnPost> {
//         return {
//   id: {string},
//   report: await REdditLikeCommunityReportAtSummaryTransformer.transform(input.report),
//   post: await REdditLikeCommunityPostAtSummaryTransformer.transform(input.post),
//         };
//       }
//     }
//--------------------------------------------------------------