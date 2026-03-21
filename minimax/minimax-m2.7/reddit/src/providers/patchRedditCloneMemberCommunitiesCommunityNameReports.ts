import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityReport";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityBanAtSummaryTransformer } from "../transformers/RedditCloneCommunityBanAtSummaryTransformer";
import { RedditCloneMemberSessionAtSummaryTransformer } from "../transformers/RedditCloneMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberCommunitiesCommunityNameReports(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCloneCommunityReport.IRequest;
}): Promise<IPageIRedditCloneCommunityReport.IIndex> {
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { name: props.communityName },
    select: { id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const isModerator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: community.id,
        reddit_clone_member_id: props.member.id,
      },
      select: { id: true },
    });
  if (!isModerator) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = (props.body.limit ?? 100) satisfies number as number;
  const skip = (page - 1) * limit;
  const dateRange: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.startDate !== undefined && props.body.startDate !== null) {
    dateRange.gte = new Date(props.body.startDate);
  }
  if (props.body.endDate !== undefined && props.body.endDate !== null) {
    dateRange.lte = new Date(props.body.endDate);
  }
  const whereClause: Prisma.reddit_clone_community_reportsWhereInput = {
    reddit_clone_community_id: community.id,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.targetType !== undefined &&
      props.body.targetType !== null && { target_type: props.body.targetType }),
    ...(Object.keys(dateRange).length > 0 && { created_at: dateRange }),
  };
  const reports = await MyGlobal.prisma.reddit_clone_community_reports.findMany(
    {
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        target_type: true,
        target_id: true,
        reason: true,
        status: true,
        resolution_note: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        reporter: RedditCloneMemberSessionAtSummaryTransformer.select(),
        community: RedditCloneCommunityBanAtSummaryTransformer.select(),
        resolvedBy: RedditCloneMemberSessionAtSummaryTransformer.select(),
      },
    },
  );
  const total = await MyGlobal.prisma.reddit_clone_community_reports.count({
    where: whereClause,
  });
  const postReports = reports.filter((r) => r.target_type === "post");
  const commentReports = reports.filter((r) => r.target_type === "comment");
  const postIds = postReports.map((r) => r.target_id);
  const commentIds = commentReports.map((r) => r.target_id);
  const posts =
    postIds.length > 0
      ? await MyGlobal.prisma.reddit_clone_posts.findMany({
          where: { id: { in: postIds } },
          select: {
            id: true,
            title: true,
            type: true,
            vote_score: true,
            comment_count: true,
            created_at: true,
            author: RedditCloneMemberSessionAtSummaryTransformer.select(),
            community: RedditCloneCommunityBanAtSummaryTransformer.select(),
          },
        })
      : [];
  const commentData =
    commentIds.length > 0
      ? await MyGlobal.prisma.reddit_clone_comments.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            updated_at: true,
            reddit_clone_member_id: true,
            reddit_clone_post_id: true,
          },
        })
      : [];
  const commentMemberIds = [
    ...new Set(commentData.map((c) => c.reddit_clone_member_id)),
  ];
  const commentPostIds = [
    ...new Set(commentData.map((c) => c.reddit_clone_post_id)),
  ];
  const [commentMembers, commentPostsData] = await Promise.all([
    commentMemberIds.length > 0
      ? MyGlobal.prisma.reddit_clone_members.findMany({
          where: { id: { in: commentMemberIds } },
          select: {
            id: true,
            username: true,
            created_at: true,
            profile: {
              select: {
                id: true,
                display_name: true,
                bio: true,
                created_at: true,
                updated_at: true,
              },
            },
            karma: {
              select: { karma_score: true },
            },
          },
        })
      : [],
    commentPostIds.length > 0
      ? MyGlobal.prisma.reddit_clone_posts.findMany({
          where: { id: { in: commentPostIds } },
          select: {
            id: true,
            title: true,
            type: true,
            vote_score: true,
            comment_count: true,
            created_at: true,
            author: RedditCloneMemberSessionAtSummaryTransformer.select(),
            community: RedditCloneCommunityBanAtSummaryTransformer.select(),
          },
        })
      : [],
  ]);
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const commentPostMap = new Map(commentPostsData.map((p) => [p.id, p]));
  const commentMemberMap = new Map(commentMembers.map((m) => [m.id, m]));
  const commentMap = new Map(commentData.map((c) => [c.id, c]));
  const transformedData: IRedditCloneCommunityReport.IIndex[] =
    await ArrayUtil.asyncMap(
      reports,
      async (report): Promise<IRedditCloneCommunityReport.IIndex> => {
        let targetPreview:
          | IRedditClonePostLink.ISummary
          | IRedditCloneComment.ISummary
          | undefined;
        if (report.target_type === "post") {
          const post = postMap.get(report.target_id);
          if (post) {
            targetPreview = {
              id: post.id,
              title: post.title,
              type: post.type,
              vote_score: post.vote_score,
              comment_count: post.comment_count,
              created_at: toISOStringSafe(post.created_at),
              author:
                await RedditCloneMemberSessionAtSummaryTransformer.transform(
                  post.author,
                ),
              community:
                await RedditCloneCommunityBanAtSummaryTransformer.transform(
                  post.community,
                ),
            } satisfies IRedditClonePostLink.ISummary;
          }
        } else if (report.target_type === "comment") {
          const comment = commentMap.get(report.target_id);
          const parentPost = comment
            ? commentPostMap.get(comment.reddit_clone_post_id)
            : undefined;
          const commentMember = comment
            ? commentMemberMap.get(comment.reddit_clone_member_id)
            : undefined;
          if (comment && parentPost && commentMember) {
            const commentProfile: IRedditCloneUserProfile.ISummary = {
              id: commentMember.profile?.id ?? commentMember.id,
              display_name:
                commentMember.profile?.display_name ?? commentMember.username,
              bio: commentMember.profile?.bio ?? null,
            };
            const commentAuthorSummary: IRedditCloneMemberSession.ISummary = {
              id: commentMember.id,
              username: commentMember.username,
              created_at: toISOStringSafe(commentMember.created_at),
              profile: commentProfile,
              karma_count: commentMember.karma?.karma_score ?? 0,
            };
            targetPreview = {
              id: comment.id,
              content: comment.content,
              vote_score: comment.vote_score,
              created_at: toISOStringSafe(comment.created_at),
              updated_at: toISOStringSafe(comment.updated_at),
              parent_comment_id: null,
              author: commentAuthorSummary,
              post: {
                id: parentPost.id,
                title: parentPost.title,
                type: parentPost.type,
                vote_score: parentPost.vote_score,
                comment_count: parentPost.comment_count,
                created_at: toISOStringSafe(parentPost.created_at),
                author:
                  await RedditCloneMemberSessionAtSummaryTransformer.transform(
                    parentPost.author,
                  ),
                community:
                  await RedditCloneCommunityBanAtSummaryTransformer.transform(
                    parentPost.community,
                  ),
              } satisfies IRedditClonePostLink.ISummary,
            } satisfies IRedditCloneComment.ISummary;
          }
        }
        return {
          id: report.id,
          targetType: report.target_type as "post" | "comment",
          targetId: report.target_id,
          targetPreview,
          reason: report.reason,
          status: report.status as "pending" | "approved" | "dismissed",
          resolutionNote: report.resolution_note ?? null,
          resolvedAt: report.resolved_at
            ? toISOStringSafe(report.resolved_at)
            : null,
          createdAt: toISOStringSafe(report.created_at),
          updatedAt: toISOStringSafe(report.updated_at),
          reporter:
            await RedditCloneMemberSessionAtSummaryTransformer.transform(
              report.reporter,
            ),
          community:
            await RedditCloneCommunityBanAtSummaryTransformer.transform(
              report.community,
            ),
          resolvedBy: report.resolvedBy
            ? await RedditCloneMemberSessionAtSummaryTransformer.transform(
                report.resolvedBy,
              )
            : null,
        } satisfies IRedditCloneCommunityReport.IIndex;
      },
    );
  return {
    data: transformedData,
    pagination: {
      current: page satisfies number & tags.Minimum<0> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number & tags.Minimum<0> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}
