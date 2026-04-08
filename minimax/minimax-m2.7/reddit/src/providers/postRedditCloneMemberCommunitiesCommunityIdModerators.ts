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
import { RedditCloneCommunityModeratorCollector } from "../collectors/RedditCloneCommunityModeratorCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityModeratorAtRecentBanTransformer } from "../transformers/RedditCloneCommunityModeratorAtRecentBanTransformer";
import { RedditCloneCommunityModeratorAtRecentPendingReportTransformer } from "../transformers/RedditCloneCommunityModeratorAtRecentPendingReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityModerator.ICreate;
}): Promise<IRedditCloneCommunityModerator> {
  // 1. Validate community exists
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  // 2. Check authorization - must be community owner OR existing moderator
  const isOwner = community.reddit_clone_member_id === props.member.id;
  if (!isOwner) {
    const existingModerator =
      await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
        where: {
          reddit_clone_community_id: props.communityId,
          reddit_clone_member_id: props.member.id,
        },
      });
    if (!existingModerator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 3. Validate target member exists
  await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { id: props.body.memberId },
  });
  // 4. Check for existing moderator assignment (unique constraint)
  const existingAssignment =
    await MyGlobal.prisma.reddit_clone_community_moderators.findUnique({
      where: {
        reddit_clone_community_id_reddit_clone_member_id: {
          reddit_clone_community_id: props.communityId,
          reddit_clone_member_id: props.body.memberId,
        },
      },
    });
  if (existingAssignment) {
    throw new HttpException(
      "Member is already a moderator in this community",
      409,
    );
  }
  // 5. Create new moderator assignment using collector
  await MyGlobal.prisma.reddit_clone_community_moderators.create({
    data: await RedditCloneCommunityModeratorCollector.collect({
      body: props.body,
      community: community,
      member: { id: props.member.id },
    }),
  });
  // 6. Build moderation dashboard response
  const now = new Date();
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
        OR: [{ expires_at: null }, { expires_at: { gt: now } }],
      },
    }),
  ]);
  const recentPendingReportsRaw =
    await MyGlobal.prisma.reddit_clone_community_reports.findMany({
      where: {
        reddit_clone_community_id: props.communityId,
        status: "pending",
      },
      orderBy: { created_at: "desc" },
      take: 10,
      ...RedditCloneCommunityModeratorAtRecentPendingReportTransformer.select(),
    });
  const recentBansRaw =
    await MyGlobal.prisma.reddit_clone_community_bans.findMany({
      where: {
        reddit_clone_community_id: props.communityId,
      },
      orderBy: { created_at: "desc" },
      take: 10,
      ...RedditCloneCommunityModeratorAtRecentBanTransformer.select(),
    });
  const recentPendingReports = await ArrayUtil.asyncMap(
    recentPendingReportsRaw,
    RedditCloneCommunityModeratorAtRecentPendingReportTransformer.transform,
  );
  const recentBans = await ArrayUtil.asyncMap(
    recentBansRaw,
    RedditCloneCommunityModeratorAtRecentBanTransformer.transform,
  );
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
// export async function postRedditCloneMemberCommunitiesCommunityIdModerators(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IRedditCloneCommunityModerator.ICreate;
// }): Promise<IRedditCloneCommunityModerator> {
//   await MyGlobal.prisma.reddit_clone_community_moderators.create({
//     data: await RedditCloneCommunityModeratorCollector.collect({
//       body: props.body,
//       ...
//     }),
//   });
// }
// ```
//--------------------------------------------------------------