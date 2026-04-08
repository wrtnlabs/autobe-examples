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

export async function putRedditCloneMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityModerator.IUpdate;
}): Promise<IRedditCloneCommunityModerator> {
  // Step 1: Fetch the moderator record to validate existence and get member info
  const moderator =
    await MyGlobal.prisma.reddit_clone_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_community_id: true,
        role: true,
      },
    });
  // Validate moderator belongs to the specified community
  if (moderator.reddit_clone_community_id !== props.communityId) {
    throw new HttpException("Moderator not found in this community", 404);
  }
  // Step 2: Verify requester is the community owner (only owner can modify moderator roles)
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, reddit_clone_member_id: true },
    });
  const isOwner = community.reddit_clone_member_id === props.member.id;
  if (!isOwner) {
    throw new HttpException(
      "Only the community owner can modify moderator roles",
      403,
    );
  }
  // Step 3: Prevent self-modification
  if (moderator.reddit_clone_member_id === props.member.id) {
    throw new HttpException("You cannot modify your own moderator role", 403);
  }
  // Step 4: Update the role and updated_at
  await MyGlobal.prisma.reddit_clone_moderators.update({
    where: { id: props.moderatorId },
    data: {
      role: props.body.role,
      updated_at: new Date(),
    },
  });
  // Step 5: Aggregate counts (using sequential await pattern)
  const pendingReportsCount =
    await MyGlobal.prisma.reddit_clone_community_reports.count({
      where: {
        reddit_clone_community_id: props.communityId,
        status: "pending",
      },
    });
  const approvedReportsCount =
    await MyGlobal.prisma.reddit_clone_community_reports.count({
      where: {
        reddit_clone_community_id: props.communityId,
        status: "approved",
      },
    });
  const dismissedReportsCount =
    await MyGlobal.prisma.reddit_clone_community_reports.count({
      where: {
        reddit_clone_community_id: props.communityId,
        status: "dismissed",
      },
    });
  const permanentBansCount =
    await MyGlobal.prisma.reddit_clone_community_bans.count({
      where: {
        reddit_clone_community_id: props.communityId,
        expires_at: null,
      },
    });
  const activeTemporaryBansCount =
    await MyGlobal.prisma.reddit_clone_community_bans.count({
      where: {
        reddit_clone_community_id: props.communityId,
        expires_at: { not: null, gt: new Date() },
      },
    });
  const activeBansCount = permanentBansCount + activeTemporaryBansCount;
  // Step 6: Fetch recent pending reports (up to 10)
  const recentPendingReportsData =
    await MyGlobal.prisma.reddit_clone_community_reports.findMany({
      where: {
        reddit_clone_community_id: props.communityId,
        status: "pending",
      },
      orderBy: { created_at: "desc" },
      take: 10,
      ...RedditCloneCommunityModeratorAtRecentPendingReportTransformer.select(),
    });
  const recentPendingReports = await ArrayUtil.asyncMap(
    recentPendingReportsData,
    RedditCloneCommunityModeratorAtRecentPendingReportTransformer.transform,
  );
  // Step 7: Fetch recent bans (up to 10)
  const recentBansData =
    await MyGlobal.prisma.reddit_clone_community_bans.findMany({
      where: {
        reddit_clone_community_id: props.communityId,
      },
      orderBy: { created_at: "desc" },
      take: 10,
      ...RedditCloneCommunityModeratorAtRecentBanTransformer.select(),
    });
  const recentBans = await ArrayUtil.asyncMap(
    recentBansData,
    RedditCloneCommunityModeratorAtRecentBanTransformer.transform,
  );
  // Step 8: Return IRedditCloneCommunityModerator response
  return {
    pendingReportsCount,
    approvedReportsCount,
    dismissedReportsCount,
    activeBansCount,
    recentPendingReports,
    recentBans,
  } satisfies IRedditCloneCommunityModerator;
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
// export async function putRedditCloneMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   moderatorId: string & tags.Format<"uuid">;
//   body: IRedditCloneCommunityModerator.IUpdate;
// }): Promise<IRedditCloneCommunityModerator> {
//   await MyGlobal.prisma.....update({
//     where: { ... },
//     data: { ... },
//   });
// }
// ```
//--------------------------------------------------------------