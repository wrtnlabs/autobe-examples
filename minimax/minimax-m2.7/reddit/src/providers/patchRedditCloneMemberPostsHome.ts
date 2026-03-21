import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberPostsHome(props: {
  member: MemberPayload;
  body: IRedditClonePostLink.IRequest;
}): Promise<IPageIRedditClonePostLink.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  const timeRange = props.body.timeRange ?? "all";
  const postType = props.body.postType;
  const subscriptions =
    await MyGlobal.prisma.reddit_clone_subscriptions.findMany({
      where: { reddit_clone_member_id: props.member.id },
      select: { reddit_clone_community_id: true },
    });
  const communityIds = subscriptions.map((s) => s.reddit_clone_community_id);
  if (communityIds.length === 0) {
    return {
      pagination: {
        current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const now = new Date();
  const timeFilter: {
    created_at?: {
      gte: Date;
    };
  } = {};
  if ((sort === "top" || sort === "controversial") && timeRange !== "all") {
    if (timeRange === "day") {
      timeFilter.created_at = {
        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      };
    } else if (timeRange === "week") {
      timeFilter.created_at = {
        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      };
    } else if (timeRange === "month") {
      timeFilter.created_at = {
        gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      };
    } else if (timeRange === "year") {
      timeFilter.created_at = {
        gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      };
    }
  }
  const orderBy: Prisma.reddit_clone_postsOrderByWithRelationInput =
    sort === "new"
      ? { created_at: "desc" }
      : sort === "top"
        ? { vote_score: "desc" }
        : sort === "controversial"
          ? { comment_count: "desc" }
          : { vote_score: "desc" };
  const whereInput = {
    deleted_at: null,
    reddit_clone_community_id: { in: communityIds },
    ...(postType !== undefined && { type: postType }),
    ...timeFilter,
  } satisfies Prisma.reddit_clone_postsWhereInput;
  const posts = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      type: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      author: {
        select: {
          id: true,
          username: true,
          created_at: true,
          karma: { select: { karma_score: true } },
          profile: {
            select: {
              id: true,
              display_name: true,
              bio: true,
              avatarFileAssociation: {
                select: {
                  id: true,
                  target_id: true,
                  target_type: true,
                  created_at: true,
                  updated_at: true,
                  file: {
                    select: {
                      id: true,
                      originalFilename: true,
                      mimeType: true,
                      fileSize: true,
                      status: true,
                      createdAt: true,
                      uploader: {
                        select: {
                          id: true,
                          username: true,
                          created_at: true,
                          karma: { select: { karma_score: true } },
                          profile: {
                            select: { id: true, display_name: true, bio: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
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
              karma: { select: { karma_score: true } },
              profile: {
                select: {
                  id: true,
                  display_name: true,
                  bio: true,
                  avatarFileAssociation: {
                    select: {
                      id: true,
                      target_id: true,
                      target_type: true,
                      created_at: true,
                      updated_at: true,
                      file: {
                        select: {
                          id: true,
                          originalFilename: true,
                          mimeType: true,
                          fileSize: true,
                          status: true,
                          createdAt: true,
                          uploader: {
                            select: {
                              id: true,
                              username: true,
                              created_at: true,
                              karma: { select: { karma_score: true } },
                              profile: {
                                select: {
                                  id: true,
                                  display_name: true,
                                  bio: true,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  const data: IRedditClonePostLink.ISummary[] = posts.map((post) => {
    const authorAvatar = post.author.profile.avatarFileAssociation?.file
      ? ({
          id: post.author.profile.avatarFileAssociation.id,
          target_id: post.author.profile.avatarFileAssociation.target_id,
          target_type: post.author.profile.avatarFileAssociation.target_type,
          created_at:
            post.author.profile.avatarFileAssociation.created_at.toISOString(),
          updated_at:
            post.author.profile.avatarFileAssociation.updated_at.toISOString(),
          file: {
            id: post.author.profile.avatarFileAssociation.file.id,
            originalFilename:
              post.author.profile.avatarFileAssociation.file.originalFilename,
            mimeType: post.author.profile.avatarFileAssociation.file.mimeType,
            fileSize: post.author.profile.avatarFileAssociation.file.fileSize,
            status: post.author.profile.avatarFileAssociation.file.status,
            createdAt:
              post.author.profile.avatarFileAssociation.file.createdAt.toISOString(),
            uploader: {
              id: post.author.profile.avatarFileAssociation.file.uploader.id,
              username:
                post.author.profile.avatarFileAssociation.file.uploader
                  .username,
              created_at:
                post.author.profile.avatarFileAssociation.file.uploader.created_at.toISOString(),
              karma_count:
                post.author.profile.avatarFileAssociation.file.uploader.karma
                  ?.karma_score ?? 0,
              profile: {
                id: post.author.profile.avatarFileAssociation.file.uploader
                  .profile.id,
                display_name:
                  post.author.profile.avatarFileAssociation.file.uploader
                    .profile.display_name,
                bio:
                  post.author.profile.avatarFileAssociation.file.uploader
                    .profile.bio ?? null,
                avatar: null,
              },
            },
          },
        } satisfies IRedditCloneFileAssociation.ISummary)
      : null;
    const communityOwnerAvatar = post.community.member.profile
      .avatarFileAssociation?.file
      ? ({
          id: post.community.member.profile.avatarFileAssociation.id,
          target_id:
            post.community.member.profile.avatarFileAssociation.target_id,
          target_type:
            post.community.member.profile.avatarFileAssociation.target_type,
          created_at:
            post.community.member.profile.avatarFileAssociation.created_at.toISOString(),
          updated_at:
            post.community.member.profile.avatarFileAssociation.updated_at.toISOString(),
          file: {
            id: post.community.member.profile.avatarFileAssociation.file.id,
            originalFilename:
              post.community.member.profile.avatarFileAssociation.file
                .originalFilename,
            mimeType:
              post.community.member.profile.avatarFileAssociation.file.mimeType,
            fileSize:
              post.community.member.profile.avatarFileAssociation.file.fileSize,
            status:
              post.community.member.profile.avatarFileAssociation.file.status,
            createdAt:
              post.community.member.profile.avatarFileAssociation.file.createdAt.toISOString(),
            uploader: {
              id: post.community.member.profile.avatarFileAssociation.file
                .uploader.id,
              username:
                post.community.member.profile.avatarFileAssociation.file
                  .uploader.username,
              created_at:
                post.community.member.profile.avatarFileAssociation.file.uploader.created_at.toISOString(),
              karma_count:
                post.community.member.profile.avatarFileAssociation.file
                  .uploader.karma?.karma_score ?? 0,
              profile: {
                id: post.community.member.profile.avatarFileAssociation.file
                  .uploader.profile.id,
                display_name:
                  post.community.member.profile.avatarFileAssociation.file
                    .uploader.profile.display_name,
                bio:
                  post.community.member.profile.avatarFileAssociation.file
                    .uploader.profile.bio ?? null,
                avatar: null,
              },
            },
          },
        } satisfies IRedditCloneFileAssociation.ISummary)
      : null;
    return {
      id: post.id as string & tags.Format<"uuid">,
      title: post.title,
      type: post.type,
      vote_score: post.vote_score as number & tags.Type<"int32">,
      comment_count: post.comment_count as number & tags.Type<"int32">,
      created_at: post.created_at.toISOString(),
      author: {
        id: post.author.id as string & tags.Format<"uuid">,
        username: post.author.username,
        created_at: post.author.created_at.toISOString(),
        karma_count: post.author.karma?.karma_score ?? 0,
        profile: {
          id: post.author.profile.id as string & tags.Format<"uuid">,
          display_name: post.author.profile.display_name,
          bio: post.author.profile.bio ?? null,
          avatar: authorAvatar,
        } satisfies IRedditCloneUserProfile.ISummary,
      } satisfies IRedditCloneMemberSession.ISummary,
      community: {
        id: post.community.id as string & tags.Format<"uuid">,
        name: post.community.name,
        description: post.community.description,
        subscriber_count: post.community.subscriber_count as number &
          tags.Type<"int32">,
        created_at: post.community.created_at.toISOString(),
        owner: {
          id: post.community.member.id as string & tags.Format<"uuid">,
          username: post.community.member.username,
          created_at: post.community.member.created_at.toISOString(),
          karma_count: post.community.member.karma?.karma_score ?? 0,
          profile: {
            id: post.community.member.profile.id as string &
              tags.Format<"uuid">,
            display_name: post.community.member.profile.display_name,
            bio: post.community.member.profile.bio ?? null,
            avatar: communityOwnerAvatar,
          } satisfies IRedditCloneUserProfile.ISummary,
        } satisfies IRedditCloneMemberSession.ISummary,
      } satisfies IRedditCloneCommunityBan.ISummary,
    } satisfies IRedditClonePostLink.ISummary;
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
    data: data,
  };
}
