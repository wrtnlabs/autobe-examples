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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityModerator.ICreate;
}): Promise<IRedditCloneCommunityModerator> {
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { id: props.communityId },
    select: {
      id: true,
      name: true,
      description: true,
      subscriber_count: true,
      member: {
        select: {
          id: true,
          username: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const existingModerator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
      },
      select: {
        id: true,
        role: true,
      },
    });
  const isOwner = community.member.id === props.member.id;
  const isModerator = existingModerator !== null;
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  const targetMember = await MyGlobal.prisma.reddit_clone_members.findUnique({
    where: { id: props.body.memberId },
    select: { id: true },
  });
  if (targetMember === null) {
    throw new HttpException("Member not found", 404);
  }
  const existingAssignment =
    await MyGlobal.prisma.reddit_clone_community_moderators.findUnique({
      where: {
        reddit_clone_community_id_reddit_clone_member_id: {
          reddit_clone_community_id: props.communityId,
          reddit_clone_member_id: props.body.memberId,
        },
      },
      select: { id: true },
    });
  if (existingAssignment !== null) {
    throw new HttpException(
      "Member is already a moderator in this community",
      409,
    );
  }
  const redditCloneCommunities: IEntity = {
    id: props.communityId,
  };
  const redditCloneMembers: IEntity = {
    id: props.member.id,
  };
  await MyGlobal.prisma.reddit_clone_community_moderators.create({
    data: await RedditCloneCommunityModeratorCollector.collect({
      body: props.body,
      redditCloneCommunities,
      redditCloneMembers,
    }),
  });
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
  const activeBansCount =
    await MyGlobal.prisma.reddit_clone_community_bans.count({
      where: {
        reddit_clone_community_id: props.communityId,
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
      },
    });
  const recentPendingReportsRaw =
    await MyGlobal.prisma.reddit_clone_community_reports.findMany({
      where: {
        reddit_clone_community_id: props.communityId,
        status: "pending",
      },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        target_type: true,
        target_id: true,
        reason: true,
        status: true,
        created_at: true,
        reporter: {
          select: {
            id: true,
            username: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  const recentPendingReports: IRedditCloneCommunityModerator.IRecentPendingReport[] =
    recentPendingReportsRaw.map((report) => ({
      id: report.id as string & tags.Format<"uuid">,
      targetType: report.target_type,
      targetId: report.target_id as string & tags.Format<"uuid">,
      reason: report.reason,
      status: report.status,
      createdAt: toISOStringSafe(report.created_at),
      reporter: {
        id: report.reporter.id as string & tags.Format<"uuid">,
        username: report.reporter.username,
        displayName: report.reporter.username,
        karmaScore: 0,
        avatar: null,
        bio: null,
        createdAt: toISOStringSafe(report.reporter.created_at),
        updatedAt: toISOStringSafe(report.reporter.updated_at),
        deletedAt: report.reporter.deleted_at
          ? toISOStringSafe(report.reporter.deleted_at)
          : null,
      } satisfies IRedditCloneMember,
      community: {
        id: community.id as string & tags.Format<"uuid">,
        name: community.name,
        description: community.description,
        subscriberCount: community.subscriber_count,
        owner: {
          id: community.member.id as string & tags.Format<"uuid">,
          username: community.member.username,
        },
      } satisfies IRedditCloneCommunity.ISummary,
    }));
  const recentBansRaw =
    await MyGlobal.prisma.reddit_clone_community_bans.findMany({
      where: {
        reddit_clone_community_id: props.communityId,
      },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        reddit_clone_member_id: true,
        reason: true,
        created_at: true,
        expires_at: true,
      },
    });
  const recentBans: IRedditCloneCommunityModerator.IRecentBan[] =
    recentBansRaw.map((ban) => ({
      id: ban.id as string & tags.Format<"uuid">,
      memberId: ban.reddit_clone_member_id as string & tags.Format<"uuid">,
      reason: ban.reason,
      createdAt: toISOStringSafe(ban.created_at),
      expiresAt: ban.expires_at ? toISOStringSafe(ban.expires_at) : null,
    }));
  return {
    pendingReportsCount,
    approvedReportsCount,
    dismissedReportsCount,
    activeBansCount,
    recentPendingReports,
    recentBans,
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