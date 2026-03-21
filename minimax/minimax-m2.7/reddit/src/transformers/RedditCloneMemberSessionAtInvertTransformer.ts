import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneMemberSessionAtInvertTransformer {
  export type Payload = Prisma.reddit_clone_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        created_at: true,
        updated_at: true,
        profile: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
            updated_at: true,
            avatarFileAssociation: {
              select: {
                id: true,
                file_id: true,
                created_at: true,
                updated_at: true,
                target_id: true,
                target_type: true,
                reddit_clone_file: {
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
                },
              },
            },
          },
        },
        karma: {
          select: {
            karma_score: true,
          },
        },
        posts: {
          select: {
            id: true,
            title: true,
            type: true,
            vote_score: true,
            comment_count: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            author: {
              select: {
                id: true,
                username: true,
                created_at: true,
                profile: {
                  select: {
                    id: true,
                    display_name: true,
                    bio: true,
                  },
                },
                karma: {
                  select: {
                    karma_score: true,
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
              },
            },
          },
        },
        comments: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            parent_comment_id: true,
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
                  },
                },
                karma: {
                  select: {
                    karma_score: true,
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
              },
            },
          },
        },
      },
    } satisfies Prisma.reddit_clone_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneMemberSession.IInvert> {
    return {
      id: input.id,
      username: input.username,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      profile: input.profile
        ? {
            id: input.profile.id,
            display_name: input.profile.display_name,
            bio: input.profile.bio ?? undefined,
            avatar: input.profile.avatarFileAssociation
              ? {
                  id: input.profile.avatarFileAssociation.id,
                  created_at: toISOStringSafe(
                    input.profile.avatarFileAssociation.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    input.profile.avatarFileAssociation.updated_at,
                  ),
                  target_id: input.profile.avatarFileAssociation.target_id,
                  target_type: input.profile.avatarFileAssociation.target_type,
                  file: input.profile.avatarFileAssociation.reddit_clone_file
                    ? {
                        id: input.profile.avatarFileAssociation
                          .reddit_clone_file.id,
                        originalFilename:
                          input.profile.avatarFileAssociation.reddit_clone_file
                            .original_filename,
                        mimeType:
                          input.profile.avatarFileAssociation.reddit_clone_file
                            .mime_type,
                        fileSize:
                          input.profile.avatarFileAssociation.reddit_clone_file
                            .file_size,
                        status:
                          input.profile.avatarFileAssociation.reddit_clone_file
                            .status,
                        createdAt: toISOStringSafe(
                          input.profile.avatarFileAssociation.reddit_clone_file
                            .created_at,
                        ),
                        uploader: input.profile.avatarFileAssociation
                          .reddit_clone_file.uploader
                          ? {
                              id: input.profile.avatarFileAssociation
                                .reddit_clone_file.uploader.id,
                              username:
                                input.profile.avatarFileAssociation
                                  .reddit_clone_file.uploader.username,
                              created_at: toISOStringSafe(
                                input.profile.avatarFileAssociation
                                  .reddit_clone_file.uploader.created_at,
                              ),
                              profile: null as never,
                              karma_count: 0,
                            }
                          : (null as never),
                      }
                    : (null as never),
                }
              : undefined,
          }
        : {
            id: input.id,
            display_name: input.username,
            bio: undefined,
            avatar: undefined,
          },
      karma_score: input.karma?.karma_score ?? 0,
      posts: await ArrayUtil.asyncMap(input.posts ?? [], async (post) => ({
        id: post.id,
        title: post.title,
        type: post.type,
        vote_score: post.vote_score,
        comment_count: post.comment_count,
        created_at: toISOStringSafe(post.created_at),
        author: {
          id: post.author.id,
          username: post.author.username,
          created_at: toISOStringSafe(post.author.created_at),
          profile: post.author.profile
            ? {
                id: post.author.profile.id,
                display_name: post.author.profile.display_name,
                bio: post.author.profile.bio ?? undefined,
                avatar: undefined,
              }
            : (null as never),
          karma_count: post.author.karma?.karma_score ?? 0,
        },
        community: {
          id: post.community.id,
          name: post.community.name,
          description: post.community.description,
          subscriber_count: post.community.subscriber_count,
          created_at: toISOStringSafe(post.community.created_at),
          owner: null as never,
        },
      })),
      comments: await ArrayUtil.asyncMap(
        input.comments ?? [],
        async (comment) => ({
          id: comment.id,
          content: comment.content,
          vote_score: comment.vote_score,
          created_at: toISOStringSafe(comment.created_at),
          updated_at: toISOStringSafe(comment.updated_at),
          parent_comment_id: comment.parent_comment_id,
          author: {
            id: comment.member.id,
            username: comment.member.username,
            created_at: toISOStringSafe(comment.member.created_at),
            profile: comment.member.profile
              ? {
                  id: comment.member.profile.id,
                  display_name: comment.member.profile.display_name,
                  bio: comment.member.profile.bio ?? undefined,
                  avatar: undefined,
                }
              : (null as never),
            karma_count: comment.member.karma?.karma_score ?? 0,
          },
          post: {
            id: comment.post.id,
            title: comment.post.title,
            type: comment.post.type,
            vote_score: comment.post.vote_score,
            comment_count: comment.post.comment_count,
            created_at: toISOStringSafe(comment.post.created_at),
            author: null as never,
            community: null as never,
          },
        }),
      ),
    };
  }
}
