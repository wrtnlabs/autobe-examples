import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function putCommunityPlatformMemberCommentsCommentIdVotesMine(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  // Verify member exists
  const member =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: props.member.id, deleted_at: null },
    });
  // Verify comment exists and is not deleted
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId, deleted_at: null },
      select: {
        id: true,
        member_id: true,
        post: {
          select: {
            community_platform_community_id: true,
          },
        },
      },
    });
  // Check if member is banned from this community
  const banExists = await MyGlobal.prisma.community_platform_bans.findFirst({
    where: {
      community_id: comment.post.community_platform_community_id,
      member_id: member.id,
    },
  });
  if (banExists) {
    throw new HttpException("Member is banned from this community", 403);
  }
  // Handle vote type validation and operation
  if (props.body.type !== undefined && props.body.type !== null) {
    const type = props.body.type satisfies "upvote" | "downvote" as
      | "upvote"
      | "downvote";
    // Upsert vote - include all required fields for create
    const vote = await MyGlobal.prisma.community_platform_comment_votes.upsert({
      where: {
        community_platform_member_id_community_platform_comment_id: {
          community_platform_member_id: member.id,
          community_platform_comment_id: comment.id,
        },
      },
      create: {
        id: v4(),
        created_at: new Date(),
        updated_at: new Date(),
        community_platform_member_id: member.id,
        community_platform_comment_id: comment.id,
        type: type,
      },
      update: {
        type: type,
        updated_at: new Date(),
      },
    });
    // Fetch member for DTO with all required ISummary fields
    const memberObj =
      await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
        where: { id: vote.community_platform_member_id, deleted_at: null },
        select: {
          id: true,
          email: true,
          username: true,
          nickname: true,
          email_verified: true,
          registered_at: true,
          last_login_at: true,
        },
      });
    // Fetch comment for DTO with all required ISummary fields and relationships
    const commentObj =
      await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
        where: { id: vote.community_platform_comment_id, deleted_at: null },
        select: {
          id: true,
          content: true,
          vote_score: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          member: {
            select: {
              id: true,
              email: true,
              username: true,
              nickname: true,
              email_verified: true,
              registered_at: true,
              last_login_at: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
              created_at: true,
              author: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  nickname: true,
                  email_verified: true,
                  registered_at: true,
                  last_login_at: true,
                },
              },
              community: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  owner: {
                    select: {
                      id: true,
                      email: true,
                      username: true,
                      nickname: true,
                      email_verified: true,
                      registered_at: true,
                      last_login_at: true,
                    },
                  },
                },
              },
            },
          },
          parent_comment_id: true,
        },
      });
    // Fetch parent comment if exists
    const parentComment = commentObj.parent_comment_id
      ? await MyGlobal.prisma.community_platform_comments.findUnique({
          where: { id: commentObj.parent_comment_id },
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            member: {
              select: {
                id: true,
                email: true,
                username: true,
                nickname: true,
                email_verified: true,
                registered_at: true,
                last_login_at: true,
              },
            },
            post: {
              select: {
                id: true,
                title: true,
                created_at: true,
                author: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                    nickname: true,
                    email_verified: true,
                    registered_at: true,
                    last_login_at: true,
                  },
                },
                community: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    owner: {
                      select: {
                        id: true,
                        email: true,
                        username: true,
                        nickname: true,
                        email_verified: true,
                        registered_at: true,
                        last_login_at: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : null;
    // Build the return object according to ICommunityPlatformCommentVote interface
    return {
      id: vote.id,
      created_at: vote.created_at.toISOString(),
      updated_at: vote.updated_at.toISOString(),
      deleted_at: vote.deleted_at ? vote.deleted_at.toISOString() : null,
      member: {
        id: memberObj.id,
        email: memberObj.email satisfies string &
          tags.Format<"email"> as string & tags.Format<"email">,
        username: memberObj.username satisfies string as string,
        nickname: memberObj.nickname ?? undefined,
        email_verified: memberObj.email_verified satisfies boolean as boolean,
        registered_at: memberObj.registered_at.toISOString(),
        last_login_at: memberObj.last_login_at?.toISOString() ?? undefined,
      } satisfies ICommunityPlatformMember.ISummary,
      comment: {
        id: commentObj.id,
        content: commentObj.content satisfies string as string,
        voteScore: commentObj.vote_score satisfies number &
          tags.Type<"int32"> as number & tags.Type<"int32">,
        createdAt: commentObj.created_at.toISOString(),
        updatedAt: commentObj.updated_at.toISOString(),
        deletedAt: commentObj.deleted_at?.toISOString() ?? null,
        author: {
          id: commentObj.member.id,
          email: commentObj.member.email satisfies string &
            tags.Format<"email"> as string & tags.Format<"email">,
          username: commentObj.member.username satisfies string as string,
          nickname: commentObj.member.nickname ?? undefined,
          email_verified: commentObj.member
            .email_verified satisfies boolean as boolean,
          registered_at: commentObj.member.registered_at.toISOString(),
          last_login_at:
            commentObj.member.last_login_at?.toISOString() ?? undefined,
        } satisfies ICommunityPlatformMember.ISummary,
        post: {
          id: commentObj.post.id,
          title: commentObj.post.title satisfies string as string,
          author: {
            id: commentObj.post.author.id,
            email: commentObj.post.author.email satisfies string &
              tags.Format<"email"> as string & tags.Format<"email">,
            username: commentObj.post.author
              .username satisfies string as string,
            nickname: commentObj.post.author.nickname ?? undefined,
            email_verified: commentObj.post.author
              .email_verified satisfies boolean as boolean,
            registered_at: commentObj.post.author.registered_at.toISOString(),
            last_login_at:
              commentObj.post.author.last_login_at?.toISOString() ?? undefined,
          } satisfies ICommunityPlatformMember.ISummary,
          community: {
            id: commentObj.post.community.id,
            name: commentObj.post.community.name satisfies string as string,
            description: commentObj.post.community.description satisfies
              | string
              | null as string | null,
            created_at: commentObj.post.community.created_at.toISOString(),
            owner: {
              id: commentObj.post.community.owner.id,
              email: commentObj.post.community.owner.email satisfies string &
                tags.Format<"email"> as string & tags.Format<"email">,
              username: commentObj.post.community.owner
                .username satisfies string as string,
              nickname: commentObj.post.community.owner.nickname ?? undefined,
              email_verified: commentObj.post.community.owner
                .email_verified satisfies boolean as boolean,
              registered_at:
                commentObj.post.community.owner.registered_at.toISOString(),
              last_login_at:
                commentObj.post.community.owner.last_login_at?.toISOString() ??
                undefined,
            } satisfies ICommunityPlatformMember.ISummary,
            subscriber_count: 0 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
          } satisfies ICommunityPlatformCommunity.ISummary,
          vote_score: 0 satisfies number & tags.Type<"int32"> as number &
            tags.Type<"int32">,
          comment_count: 0 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
          created_at: commentObj.post.created_at.toISOString(),
          content_preview: commentObj.post.title satisfies string as string,
        } satisfies ICommunityPlatformPost.ISummary,
        parent: parentComment
          ? ({
              id: parentComment.id,
              content: parentComment.content satisfies string as string,
              voteScore: parentComment.vote_score satisfies number &
                tags.Type<"int32"> as number & tags.Type<"int32">,
              createdAt: parentComment.created_at.toISOString(),
              updatedAt: parentComment.updated_at.toISOString(),
              deletedAt: parentComment.deleted_at?.toISOString() ?? null,
              author: {
                id: parentComment.member.id,
                email: parentComment.member.email satisfies string &
                  tags.Format<"email"> as string & tags.Format<"email">,
                username: parentComment.member
                  .username satisfies string as string,
                nickname: parentComment.member.nickname ?? undefined,
                email_verified: parentComment.member
                  .email_verified satisfies boolean as boolean,
                registered_at: parentComment.member.registered_at.toISOString(),
                last_login_at:
                  parentComment.member.last_login_at?.toISOString() ??
                  undefined,
              } satisfies ICommunityPlatformMember.ISummary,
              post: {
                id: parentComment.post.id,
                title: parentComment.post.title satisfies string as string,
                author: {
                  id: parentComment.post.author.id,
                  email: parentComment.post.author.email satisfies string &
                    tags.Format<"email"> as string & tags.Format<"email">,
                  username: parentComment.post.author
                    .username satisfies string as string,
                  nickname: parentComment.post.author.nickname ?? undefined,
                  email_verified: parentComment.post.author
                    .email_verified satisfies boolean as boolean,
                  registered_at:
                    parentComment.post.author.registered_at.toISOString(),
                  last_login_at:
                    parentComment.post.author.last_login_at?.toISOString() ??
                    undefined,
                } satisfies ICommunityPlatformMember.ISummary,
                community: {
                  id: parentComment.post.community.id,
                  name: parentComment.post.community
                    .name satisfies string as string,
                  description: parentComment.post.community
                    .description satisfies string | null as string | null,
                  created_at:
                    parentComment.post.community.created_at.toISOString(),
                  owner: {
                    id: parentComment.post.community.owner.id,
                    email: parentComment.post.community.owner
                      .email satisfies string & tags.Format<"email"> as string &
                      tags.Format<"email">,
                    username: parentComment.post.community.owner
                      .username satisfies string as string,
                    nickname:
                      parentComment.post.community.owner.nickname ?? undefined,
                    email_verified: parentComment.post.community.owner
                      .email_verified satisfies boolean as boolean,
                    registered_at:
                      parentComment.post.community.owner.registered_at.toISOString(),
                    last_login_at:
                      parentComment.post.community.owner.last_login_at?.toISOString() ??
                      undefined,
                  } satisfies ICommunityPlatformMember.ISummary,
                  subscriber_count: 0 satisfies number &
                    tags.Type<"int32"> &
                    tags.Minimum<0> as number &
                    tags.Type<"int32"> &
                    tags.Minimum<0>,
                } satisfies ICommunityPlatformCommunity.ISummary,
                vote_score: 0 satisfies number & tags.Type<"int32"> as number &
                  tags.Type<"int32">,
                comment_count: 0 satisfies number &
                  tags.Type<"int32"> &
                  tags.Minimum<0> as number &
                  tags.Type<"int32"> &
                  tags.Minimum<0>,
                created_at: parentComment.post.created_at.toISOString(),
                content_preview: parentComment.post
                  .title satisfies string as string,
              } satisfies ICommunityPlatformPost.ISummary,
              parent: undefined,
            } satisfies ICommunityPlatformComment.ISummary)
          : undefined,
      } satisfies ICommunityPlatformComment.ISummary,
      type: type satisfies "upvote" | "downvote" | null as
        | "upvote"
        | "downvote"
        | null,
    };
  } else {
    // Handle null vote type (remove vote)
    await MyGlobal.prisma.community_platform_comment_votes.updateMany({
      where: {
        community_platform_member_id: member.id,
        community_platform_comment_id: comment.id,
        deleted_at: null,
      },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
    // Fetch the soft-deleted vote to return
    const deletedVote =
      await MyGlobal.prisma.community_platform_comment_votes.findFirstOrThrow({
        where: {
          community_platform_member_id: member.id,
          community_platform_comment_id: comment.id,
          deleted_at: { not: null },
        },
        orderBy: { updated_at: "desc" },
      });
    // Fetch member for DTO
    const memberObj =
      await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
        where: {
          id: deletedVote.community_platform_member_id,
          deleted_at: null,
        },
        select: {
          id: true,
          email: true,
          username: true,
          nickname: true,
          email_verified: true,
          registered_at: true,
          last_login_at: true,
        },
      });
    // Fetch comment for DTO with author
    const commentObj =
      await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
        where: {
          id: deletedVote.community_platform_comment_id,
          deleted_at: null,
        },
        select: {
          id: true,
          content: true,
          vote_score: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          member: {
            select: {
              id: true,
              email: true,
              username: true,
              nickname: true,
              email_verified: true,
              registered_at: true,
              last_login_at: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
              created_at: true,
              author: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  nickname: true,
                  email_verified: true,
                  registered_at: true,
                  last_login_at: true,
                },
              },
              community: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  owner: {
                    select: {
                      id: true,
                      email: true,
                      username: true,
                      nickname: true,
                      email_verified: true,
                      registered_at: true,
                      last_login_at: true,
                    },
                  },
                },
              },
            },
          },
          parent_comment_id: true,
        },
      });
    // Build the return object for deleted vote
    return {
      id: deletedVote.id,
      created_at: deletedVote.created_at.toISOString(),
      updated_at: deletedVote.updated_at.toISOString(),
      deleted_at: deletedVote.deleted_at
        ? deletedVote.deleted_at.toISOString()
        : null,
      member: {
        id: memberObj.id,
        email: memberObj.email satisfies string &
          tags.Format<"email"> as string & tags.Format<"email">,
        username: memberObj.username satisfies string as string,
        nickname: memberObj.nickname ?? undefined,
        email_verified: memberObj.email_verified satisfies boolean as boolean,
        registered_at: memberObj.registered_at.toISOString(),
        last_login_at: memberObj.last_login_at?.toISOString() ?? undefined,
      } satisfies ICommunityPlatformMember.ISummary,
      comment: {
        id: commentObj.id,
        content: commentObj.content satisfies string as string,
        voteScore: commentObj.vote_score satisfies number &
          tags.Type<"int32"> as number & tags.Type<"int32">,
        createdAt: commentObj.created_at.toISOString(),
        updatedAt: commentObj.updated_at.toISOString(),
        deletedAt: commentObj.deleted_at?.toISOString() ?? null,
        author: {
          id: commentObj.member.id,
          email: commentObj.member.email satisfies string &
            tags.Format<"email"> as string & tags.Format<"email">,
          username: commentObj.member.username satisfies string as string,
          nickname: commentObj.member.nickname ?? undefined,
          email_verified: commentObj.member
            .email_verified satisfies boolean as boolean,
          registered_at: commentObj.member.registered_at.toISOString(),
          last_login_at:
            commentObj.member.last_login_at?.toISOString() ?? undefined,
        } satisfies ICommunityPlatformMember.ISummary,
        post: {
          id: commentObj.post.id,
          title: commentObj.post.title satisfies string as string,
          author: {
            id: commentObj.post.author.id,
            email: commentObj.post.author.email satisfies string &
              tags.Format<"email"> as string & tags.Format<"email">,
            username: commentObj.post.author
              .username satisfies string as string,
            nickname: commentObj.post.author.nickname ?? undefined,
            email_verified: commentObj.post.author
              .email_verified satisfies boolean as boolean,
            registered_at: commentObj.post.author.registered_at.toISOString(),
            last_login_at:
              commentObj.post.author.last_login_at?.toISOString() ?? undefined,
          } satisfies ICommunityPlatformMember.ISummary,
          community: {
            id: commentObj.post.community.id,
            name: commentObj.post.community.name satisfies string as string,
            description: commentObj.post.community.description satisfies
              | string
              | null as string | null,
            created_at: commentObj.post.community.created_at.toISOString(),
            owner: {
              id: commentObj.post.community.owner.id,
              email: commentObj.post.community.owner.email satisfies string &
                tags.Format<"email"> as string & tags.Format<"email">,
              username: commentObj.post.community.owner
                .username satisfies string as string,
              nickname: commentObj.post.community.owner.nickname ?? undefined,
              email_verified: commentObj.post.community.owner
                .email_verified satisfies boolean as boolean,
              registered_at:
                commentObj.post.community.owner.registered_at.toISOString(),
              last_login_at:
                commentObj.post.community.owner.last_login_at?.toISOString() ??
                undefined,
            } satisfies ICommunityPlatformMember.ISummary,
            subscriber_count: 0 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
          } satisfies ICommunityPlatformCommunity.ISummary,
          vote_score: 0 satisfies number & tags.Type<"int32"> as number &
            tags.Type<"int32">,
          comment_count: 0 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
          created_at: commentObj.post.created_at.toISOString(),
          content_preview: commentObj.post.title satisfies string as string,
        } satisfies ICommunityPlatformPost.ISummary,
        parent: undefined,
      } satisfies ICommunityPlatformComment.ISummary,
      type: null satisfies "upvote" | "downvote" | null as
        | "upvote"
        | "downvote"
        | null,
    };
  }
}
