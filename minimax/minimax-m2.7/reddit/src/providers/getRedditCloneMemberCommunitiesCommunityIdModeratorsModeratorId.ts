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
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityModeratorAtRecentBanTransformer } from "../transformers/RedditCloneCommunityModeratorAtRecentBanTransformer";
import { RedditCloneCommunityModeratorAtRecentPendingReportTransformer } from "../transformers/RedditCloneCommunityModeratorAtRecentPendingReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunityModerator> {
  // Verify community exists
  await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Compute all aggregation counts in parallel
  const [
    pendingReportsCount,
    approvedReportsCount,
    dismissedReportsCount,
    activeBansCount,
  ] = await Promise.all([
    MyGlobal.prisma.reddit_clone_community_reports.count({
      where: {
        reddit_clone_community_id: props.communityId,
        status: "pending",
      },
    }),
    MyGlobal.prisma.reddit_clone_community_reports.count({
      where: {
        reddit_clone_community_id: props.communityId,
        status: "approved",
      },
    }),
    MyGlobal.prisma.reddit_clone_community_reports.count({
      where: {
        reddit_clone_community_id: props.communityId,
        status: "dismissed",
      },
    }),
    MyGlobal.prisma.reddit_clone_community_bans.count({
      where: {
        reddit_clone_community_id: props.communityId,
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
      },
    }),
  ]);
  // Fetch recent pending reports (top 10, ordered by created_at desc)
  const recentReports =
    await MyGlobal.prisma.reddit_clone_community_reports.findMany({
      where: {
        reddit_clone_community_id: props.communityId,
        status: "pending",
      },
      orderBy: { created_at: "desc" },
      take: 10,
      ...RedditCloneCommunityModeratorAtRecentPendingReportTransformer.select(),
    });
  // Fetch recent bans (top 10, ordered by created_at desc)
  const recentBans = await MyGlobal.prisma.reddit_clone_community_bans.findMany(
    {
      where: {
        reddit_clone_community_id: props.communityId,
      },
      orderBy: { created_at: "desc" },
      take: 10,
      ...RedditCloneCommunityModeratorAtRecentBanTransformer.select(),
    },
  );
  // Return complete moderation dashboard response
  return {
    pendingReportsCount: pendingReportsCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    approvedReportsCount: approvedReportsCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    dismissedReportsCount: dismissedReportsCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    activeBansCount: activeBansCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    recentPendingReports: await ArrayUtil.asyncMap(recentReports, (r) =>
      RedditCloneCommunityModeratorAtRecentPendingReportTransformer.transform(
        r,
      ),
    ),
    recentBans: await ArrayUtil.asyncMap(recentBans, (r) =>
      RedditCloneCommunityModeratorAtRecentBanTransformer.transform(r),
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   moderatorId: string & tags.Format<"uuid">;
// }): Promise<IRedditCloneCommunityModerator> {
//   return {
//     pendingReportsCount: ...,
//     approvedReportsCount: ...,
//     dismissedReportsCount: ...,
//     activeBansCount: ...,
//     recentPendingReports: await ArrayUtil.asyncMap(..., (r) => RedditCloneCommunityModeratorAtRecentPendingReportTransformer.transform(r)),
//     recentBans: await ArrayUtil.asyncMap(..., (r) => RedditCloneCommunityModeratorAtRecentBanTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------