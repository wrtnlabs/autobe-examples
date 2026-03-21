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

export async function patchRedditCloneMemberReports(props: {
  member: MemberPayload;
  body: IRedditCloneReport.IRequest;
}): Promise<IPageIRedditCloneReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereConditions: Prisma.reddit_clone_reportsWhereInput[] = [
    {
      reddit_clone_member_id: props.member.id,
    },
  ];
  // Filter by status
  if (props.body.status) {
    whereConditions.push({
      status: props.body.status,
    });
  }
  // Filter by target_type
  if (props.body.target_type) {
    whereConditions.push({
      target_type: props.body.target_type,
    });
  }
  // Filter by community_id
  if (props.body.community_id) {
    whereConditions.push({
      reddit_clone_community_id: props.body.community_id,
    });
  }
  // Filter by date range
  if (props.body.from_date || props.body.to_date) {
    whereConditions.push({
      created_at: {
        ...(props.body.from_date && { gte: new Date(props.body.from_date) }),
        ...(props.body.to_date && { lte: new Date(props.body.to_date) }),
      },
    });
  }
  const whereInput: Prisma.reddit_clone_reportsWhereInput = {
    AND: whereConditions,
  };
  // Query reports with community join
  const reports = await MyGlobal.prisma.reddit_clone_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      target_type: true,
      target_id: true,
      reason: true,
      status: true,
      created_at: true,
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          subscriber_count: true,
          created_at: true,
          member: {
            select: {
              id: true,
              username: true,
              created_at: true,
              profile: {
                select: {
                  id: true,
                  display_name: true,
                  bio: true,
                  avatarFileAssociation: {
                    select: {
                      id: true,
                      target_type: true,
                      target_id: true,
                      created_at: true,
                      updated_at: true,
                    },
                  },
                },
              },
              karma: {
                select: {
                  karma_score: true,
                },
              },
            },
          },
        },
      },
    },
  });
  // Count total matching records
  const total = await MyGlobal.prisma.reddit_clone_reports.count({
    where: whereInput,
  });
  // Fetch post and comment content for content preview
  const postIds = reports
    .filter((r) => r.target_type === "post")
    .map((r) => r.target_id);
  const commentIds = reports
    .filter((r) => r.target_type === "comment")
    .map((r) => r.target_id);
  // Fetch file associations for avatars
  const avatarFileIds = reports
    .map((r) => r.community?.member?.profile?.avatarFileAssociation?.target_id)
    .filter((id): id is string => id !== null && id !== undefined);
  const [posts, comments, avatarFiles] = await Promise.all([
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
      : [],
    commentIds.length > 0
      ? MyGlobal.prisma.reddit_clone_comments.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            content: true,
          },
        })
      : [],
    avatarFileIds.length > 0
      ? MyGlobal.prisma.reddit_clone_files.findMany({
          where: { id: { in: avatarFileIds } },
          select: {
            id: true,
            original_filename: true,
            mime_type: true,
            file_size: true,
            status: true,
            created_at: true,
            uploader: {
              select: {
                id: true,
                username: true,
                created_at: true,
              },
            },
          },
        })
      : [],
  ]);
  const postsMap = new Map(posts.map((p) => [p.id, p]));
  const commentsMap = new Map(comments.map((c) => [c.id, c]));
  const avatarFilesMap = new Map(avatarFiles.map((f) => [f.id, f]));
  // Transform reports to response format
  const transformedReports = reports.map((report) => {
    const community = report.community;
    const post =
      report.target_type === "post" ? postsMap.get(report.target_id) : null;
    const comment =
      report.target_type === "comment"
        ? commentsMap.get(report.target_id)
        : null;
    const member = community?.member;
    const profile = member?.profile;
    const avatarAssoc = profile?.avatarFileAssociation;
    const avatarFile = avatarAssoc?.target_id
      ? avatarFilesMap.get(avatarAssoc.target_id)
      : null;
    const uploader = avatarFile?.uploader;
    return {
      id: report.id,
      target_type: report.target_type as "post" | "comment",
      target_id: report.target_id,
      reason: report.reason,
      status: report.status as "pending" | "approved" | "dismissed",
      created_at: toISOStringSafe(report.created_at),
      community: community
        ? {
            id: community.id,
            name: community.name,
            description: community.description,
            subscriber_count: community.subscriber_count,
            created_at: toISOStringSafe(community.created_at),
            owner: member
              ? {
                  id: member.id,
                  username: member.username,
                  created_at: toISOStringSafe(member.created_at),
                  profile: profile
                    ? {
                        id: profile.id,
                        display_name: profile.display_name,
                        bio: profile.bio ?? undefined,
                        avatar: avatarAssoc
                          ? {
                              id: avatarAssoc.id,
                              target_type: avatarAssoc.target_type,
                              target_id: avatarAssoc.target_id,
                              created_at: toISOStringSafe(
                                avatarAssoc.created_at,
                              ),
                              updated_at: toISOStringSafe(
                                avatarAssoc.updated_at,
                              ),
                              file: avatarFile
                                ? {
                                    id: avatarFile.id,
                                    originalFilename:
                                      avatarFile.original_filename,
                                    mimeType: avatarFile.mime_type,
                                    fileSize: avatarFile.file_size,
                                    status: avatarFile.status,
                                    createdAt: toISOStringSafe(
                                      avatarFile.created_at,
                                    ),
                                    uploader: uploader
                                      ? {
                                          id: uploader.id,
                                          username: uploader.username,
                                          created_at: toISOStringSafe(
                                            uploader.created_at,
                                          ),
                                        }
                                      : null,
                                  }
                                : null,
                            }
                          : null,
                      }
                    : null,
                  karma_count: member.karma?.karma_score ?? 0,
                }
              : null,
          }
        : null,
      post_title: post?.title ?? null,
      post_content: post?.postTextContent?.body ?? null,
      comment_content: comment?.content ?? null,
    };
  });
  return {
    data: transformedReports as IRedditCloneReport.ISummary[],
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
