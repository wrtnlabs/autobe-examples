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

export async function getRedditCloneMemberCommunitiesCommunityIdModerationDashboard(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunityModerator> {
  // Verify moderator/owner access
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
      },
    });
  if (moderator === null) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  // Query summary statistics
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
  // Query recent pending reports
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
  // Query recent bans
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
  // Transform and return response
  return {
    pendingReportsCount: pendingReportsCount,
    approvedReportsCount: approvedReportsCount,
    dismissedReportsCount: dismissedReportsCount,
    activeBansCount: activeBansCount,
    recentPendingReports: await ArrayUtil.asyncMap(
      recentReports,
      RedditCloneCommunityModeratorAtRecentPendingReportTransformer.transform,
    ),
    recentBans: await ArrayUtil.asyncMap(
      recentBans,
      RedditCloneCommunityModeratorAtRecentBanTransformer.transform,
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
// export async function getRedditCloneMemberCommunitiesCommunityIdModerationDashboard(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
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