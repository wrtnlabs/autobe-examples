import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberReportsHistory(props: {
  member: MemberPayload;
  body: IRedditCloneReport.IRequest;
}): Promise<IPageIRedditCloneReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const dateFilter: Prisma.reddit_clone_reportsWhereInput["created_at"] = {};
  if (props.body.from_date) {
    dateFilter.gte = new Date(props.body.from_date as string);
  }
  if (props.body.to_date) {
    dateFilter.lte = new Date(props.body.to_date as string);
  }
  const whereInput = {
    reddit_clone_member_id: props.member.id,
    ...(props.body.community_id && {
      reddit_clone_community_id: props.body.community_id,
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.target_type && {
      target_type: props.body.target_type,
    }),
    ...(Object.keys(dateFilter).length > 0 && {
      created_at: dateFilter,
    }),
  } satisfies Prisma.reddit_clone_reportsWhereInput;
  const reports = await MyGlobal.prisma.reddit_clone_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      community: {
        include: {
          member: {
            include: {
              profile: {
                include: {
                  avatarFileAssociation: true,
                },
              },
              karma: true,
            },
          },
        },
      },
    },
  });
  const postReports = reports.filter((r) => r.target_type === "post");
  const commentReports = reports.filter((r) => r.target_type === "comment");
  const postIds = postReports.map((r) => r.target_id);
  const commentIds = commentReports.map((r) => r.target_id);
  const [posts, comments] = await Promise.all([
    postIds.length > 0
      ? MyGlobal.prisma.reddit_clone_posts.findMany({
          where: { id: { in: postIds } },
          select: {
            id: true,
            title: true,
            postTextContent: {
              select: {
                body: true,
              },
            },
          },
        })
      : ([] as const),
    commentIds.length > 0
      ? MyGlobal.prisma.reddit_clone_comments.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            content: true,
          },
        })
      : ([] as const),
  ]);
  const postsMap = new Map(posts.map((p) => [p.id, p]));
  const commentsMap = new Map(comments.map((c) => [c.id, c]));
  const data = reports.map((report) => {
    const post =
      report.target_type === "post" ? postsMap.get(report.target_id) : null;
    const comment =
      report.target_type === "comment"
        ? commentsMap.get(report.target_id)
        : null;
    const profile = report.community.member.profile;
    const avatarAssoc = profile?.avatarFileAssociation;
    return {
      id: report.id as string & tags.Format<"uuid">,
      target_type: report.target_type as "post" | "comment",
      target_id: report.target_id as string & tags.Format<"uuid">,
      reason: report.reason,
      status: report.status as "pending" | "approved" | "dismissed",
      created_at: toISOStringSafe(report.created_at),
      community: {
        id: report.community.id as string & tags.Format<"uuid">,
        name: report.community.name,
        description: report.community.description,
        subscriber_count: report.community.subscriber_count,
        created_at: toISOStringSafe(report.community.created_at),
        owner: {
          id: report.community.member.id as string & tags.Format<"uuid">,
          username: report.community.member.username,
          created_at: toISOStringSafe(report.community.member.created_at),
          profile: profile
            ? {
                id: profile.id as string & tags.Format<"uuid">,
                display_name: profile.display_name,
                bio: profile.bio ?? undefined,
                avatar: avatarAssoc
                  ? {
                      id: avatarAssoc.id as string & tags.Format<"uuid">,
                      target_type: avatarAssoc.target_type,
                      target_id: avatarAssoc.target_id as string &
                        tags.Format<"uuid">,
                      created_at: toISOStringSafe(avatarAssoc.created_at),
                      updated_at: toISOStringSafe(avatarAssoc.updated_at),
                      file: undefined,
                    }
                  : undefined,
              }
            : null,
          karma_count: report.community.member.karma?.karma_score ?? 0,
        },
      },
      post_title: post?.title,
      post_content: post?.postTextContent?.body,
      comment_content: comment?.content,
    };
  });
  const total = await MyGlobal.prisma.reddit_clone_reports.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: data as IRedditCloneReport.ISummary[],
  };
}
