import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPaginationMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPaginationMetadatum";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReportOverviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportOverviewItem";
import { IRedditCommunityReportsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverview";
import { IRedditCommunityReportsOverviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverviewStatistic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityReportOverviewItemTransformer } from "./RedditCommunityReportOverviewItemTransformer";

export namespace RedditCommunityReportsOverviewTransformer {
  export type Payload = Array<
    Prisma.reddit_community_reportsGetPayload<ReturnType<typeof select>>
  >;
  export function select() {
    return {
      select: {
        ...RedditCommunityReportOverviewItemTransformer.select().select,
      },
    } satisfies Prisma.reddit_community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    statistics: IRedditCommunityReportsOverviewStatistic,
    pagination: IPaginationMetadatum,
  ): Promise<IRedditCommunityReportsOverview> {
    return {
      statistics,
      reports: await ArrayUtil.asyncMap(
        input,
        RedditCommunityReportOverviewItemTransformer.transform,
      ),
      pagination,
    } satisfies IRedditCommunityReportsOverview;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityReportsOverviewTransformer {
//       export type Payload = Prisma.reddit_community_reportsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             ...
//           },
//         } satisfies Prisma.reddit_community_reportsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityReportsOverview> {
//         return {
//   statistics: {IRedditCommunityReportsOverviewStatistic},
//   reports: {Array<IRedditCommunityReportOverviewItem>},
//   pagination: {IPaginationMetadatum},
//         };
//       }
//     }
//--------------------------------------------------------------