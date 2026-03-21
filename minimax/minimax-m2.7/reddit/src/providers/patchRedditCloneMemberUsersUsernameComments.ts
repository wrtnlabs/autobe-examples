import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
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

export async function patchRedditCloneMemberUsersUsernameComments(props: {
  member: MemberPayload;
  username: string;
  body: IRedditCloneComment.IRequest;
}): Promise<IPageIRedditCloneComment.ISummary> {
  const targetMember = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: {
      username: props.username,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (targetMember === null) {
    throw new HttpException("Member not found", 404);
  }
  const isOwner = props.member.id === targetMember.id;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.reddit_clone_commentsWhereInput = {
    reddit_clone_member_id: targetMember.id,
    ...(isOwner ? {} : { deleted_at: null }),
  };
  let orderBy: Prisma.reddit_clone_commentsOrderByWithRelationInput[];
  switch (props.body.sortBy) {
    case "best":
      orderBy = [{ vote_score: "desc" }, { created_at: "desc" }];
      break;
    case "controversial":
      orderBy = [{ created_at: "desc" }];
      break;
    case "new":
    default:
      orderBy = [{ created_at: "desc" }];
      break;
  }
  const comments = await MyGlobal.prisma.reddit_clone_comments.findMany({
    where: whereClause,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      content: true,
      vote_score: true,
      created_at: true,
      updated_at: true,
      parent_comment_id: true,
      member: {
        select: {
          id: true,
          username: true,
          created_at: true,
          karma: {
            select: {
              karma_score: true,
            },
          },
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
                      original_filename: true,
                      mimeType: true,
                      fileSize: true,
                      status: true,
                      createdAt: true,
                      uploader: {
                        select: {
                          id: true,
                          username: true,
                          created_at: true,
                          karma: {
                            select: {
                              karma_score: true,
                            },
                          },
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
      post: {
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
              karma: {
                select: {
                  karma_score: true,
                },
              },
              profile: {
                select: {
                  id: true,
                  display_name: true,
                  bio: true,
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
                  karma: {
                    select: {
                      karma_score: true,
                    },
                  },
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
  });
  const total = await MyGlobal.prisma.reddit_clone_comments.count({
    where: whereClause,
  });
  const transformedComments: IRedditCloneComment.ISummary[] = comments.map(
    (comment) => {
      const authorProfile = comment.member.profile;
      const authorAvatar = authorProfile?.avatarFileAssociation;
      const postAuthorProfile = comment.post.author.profile;
      return {
        id: comment.id as string & tags.Format<"uuid">,
        content: comment.content,
        vote_score: comment.vote_score as number & tags.Type<"int32">,
        created_at: toISOStringSafe(comment.created_at),
        updated_at: toISOStringSafe(comment.updated_at),
        parent_comment_id: comment.parent_comment_id as
          | (string & tags.Format<"uuid">)
          | null,
        author: {
          id: comment.member.id as string & tags.Format<"uuid">,
          username: comment.member.username,
          created_at: toISOStringSafe(comment.member.created_at),
          karma_count: (comment.member.karma?.karma_score ?? 0) as number &
            tags.Type<"int32">,
          profile: {
            id: authorProfile.id as string & tags.Format<"uuid">,
            display_name: authorProfile.display_name,
            bio: authorProfile.bio ?? undefined,
            avatar: authorAvatar
              ? {
                  id: authorAvatar.id as string & tags.Format<"uuid">,
                  target_id: authorAvatar.target_id as string &
                    tags.Format<"uuid">,
                  target_type: authorAvatar.target_type,
                  created_at: toISOStringSafe(authorAvatar.created_at),
                  updated_at: toISOStringSafe(authorAvatar.updated_at),
                  file: {
                    id: authorAvatar.file.id as string & tags.Format<"uuid">,
                    originalFilename: authorAvatar.file.original_filename,
                    mimeType: authorAvatar.file.mimeType,
                    fileSize: authorAvatar.file.fileSize as number &
                      tags.Type<"int32">,
                    status: authorAvatar.file.status,
                    createdAt: toISOStringSafe(authorAvatar.file.createdAt),
                    uploader: {
                      id: authorAvatar.file.uploader.id as string &
                        tags.Format<"uuid">,
                      username: authorAvatar.file.uploader.username,
                      created_at: toISOStringSafe(
                        authorAvatar.file.uploader.created_at,
                      ),
                      karma_count: (authorAvatar.file.uploader.karma
                        ?.karma_score ?? 0) as number & tags.Type<"int32">,
                      profile: {
                        id: authorAvatar.file.uploader.profile.id as string &
                          tags.Format<"uuid">,
                        display_name:
                          authorAvatar.file.uploader.profile.display_name,
                        bio:
                          authorAvatar.file.uploader.profile.bio ?? undefined,
                      },
                    },
                  },
                }
              : undefined,
          },
        } satisfies IRedditCloneMemberSession.ISummary,
        post: {
          id: comment.post.id as string & tags.Format<"uuid">,
          title: comment.post.title,
          type: comment.post.type,
          vote_score: comment.post.vote_score as number & tags.Type<"int32">,
          comment_count: comment.post.comment_count as number &
            tags.Type<"int32">,
          created_at: toISOStringSafe(comment.post.created_at),
          author: {
            id: comment.post.author.id as string & tags.Format<"uuid">,
            username: comment.post.author.username,
            created_at: toISOStringSafe(comment.post.author.created_at),
            karma_count: (comment.post.author.karma?.karma_score ??
              0) as number & tags.Type<"int32">,
            profile: {
              id: postAuthorProfile.id as string & tags.Format<"uuid">,
              display_name: postAuthorProfile.display_name,
              bio: postAuthorProfile.bio ?? undefined,
            },
          },
          community: {
            id: comment.post.community.id as string & tags.Format<"uuid">,
            name: comment.post.community.name,
            description: comment.post.community.description,
            subscriber_count: comment.post.community
              .subscriber_count as number & tags.Type<"int32">,
            created_at: toISOStringSafe(comment.post.community.created_at),
            owner: {
              id: comment.post.community.member.id as string &
                tags.Format<"uuid">,
              username: comment.post.community.member.username,
              created_at: toISOStringSafe(
                comment.post.community.member.created_at,
              ),
              karma_count: (comment.post.community.member.karma?.karma_score ??
                0) as number & tags.Type<"int32">,
              profile: {
                id: comment.post.community.member.profile.id as string &
                  tags.Format<"uuid">,
                display_name:
                  comment.post.community.member.profile.display_name,
                bio: comment.post.community.member.profile.bio ?? undefined,
              },
            },
          },
        } satisfies IRedditClonePostLink.ISummary,
      } satisfies IRedditCloneComment.ISummary;
    },
  );
  if (props.body.sortBy === "controversial") {
    transformedComments.sort((a, b) => {
      const aControversy = Math.abs(a.vote_score);
      const bControversy = Math.abs(b.vote_score);
      return aControversy - bControversy;
    });
  }
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: transformedComments,
  };
}
