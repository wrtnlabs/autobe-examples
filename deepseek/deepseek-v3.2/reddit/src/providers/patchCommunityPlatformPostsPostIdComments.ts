import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  // Get pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.community_platform_commentsWhereInput = {
    post_id: props.postId,
    deleted_at: null,
    ...(props.body.parent_comment_id !== undefined && {
      parent_comment_id: props.body.parent_comment_id,
    }),
    ...(props.body.search && {
      content: { contains: props.body.search, mode: "insensitive" as const },
    }),
  };
  // Build orderBy based on sort algorithm
  let orderBy: Prisma.community_platform_commentsOrderByWithRelationInput;
  switch (props.body.sort ?? "best") {
    case "best":
      orderBy = { vote_score: "desc" };
      break;
    case "new":
      orderBy = { created_at: "desc" };
      break;
    case "controversial":
      // Controversial: comments with vote score closest to zero first, then most recent
      // We'll handle this with raw SQL or separate query approach
      orderBy = { created_at: "desc" };
      break;
    default:
      orderBy = { vote_score: "desc" };
  }
  // Execute queries
  const data = await MyGlobal.prisma.community_platform_comments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      content: true,
      vote_score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      parent_comment_id: true,
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
      } satisfies Prisma.community_platform_membersFindManyArgs,
      post: {
        select: {
          id: true,
          title: true,
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
          } satisfies Prisma.community_platform_membersFindManyArgs,
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
              } satisfies Prisma.community_platform_membersFindManyArgs,
            },
          } satisfies Prisma.community_platform_communitiesFindManyArgs,
          vote_score: true,
          comment_count: true,
          created_at: true,
          content_preview: true,
        },
      } satisfies Prisma.community_platform_postsFindManyArgs,
      parent: {
        select: {
          id: true,
          content: true,
          vote_score: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
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
          } satisfies Prisma.community_platform_membersFindManyArgs,
          post: {
            select: {
              id: true,
              title: true,
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
              } satisfies Prisma.community_platform_membersFindManyArgs,
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
                  } satisfies Prisma.community_platform_membersFindManyArgs,
                },
              } satisfies Prisma.community_platform_communitiesFindManyArgs,
              vote_score: true,
              comment_count: true,
              created_at: true,
              content_preview: true,
            },
          } satisfies Prisma.community_platform_postsFindManyArgs,
        },
      } satisfies Prisma.community_platform_commentsFindManyArgs,
    },
  });
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where,
  });
  // Transform results
  const transformedData = data.map(
    (comment) =>
      ({
        id: comment.id as string & tags.Format<"uuid">,
        content: comment.content,
        voteScore: comment.vote_score,
        createdAt: comment.created_at.toISOString(),
        updatedAt: comment.updated_at.toISOString(),
        deletedAt: comment.deleted_at?.toISOString() ?? null,
        author: {
          id: comment.author.id as string & tags.Format<"uuid">,
          email: comment.author.email,
          username: comment.author.username,
          nickname: comment.author.nickname ?? null,
          email_verified: comment.author.email_verified,
          registered_at: comment.author.registered_at.toISOString(),
          last_login_at: comment.author.last_login_at?.toISOString() ?? null,
        } satisfies ICommunityPlatformMember.ISummary,
        post: {
          id: comment.post.id as string & tags.Format<"uuid">,
          title: comment.post.title,
          author: {
            id: comment.post.author.id as string & tags.Format<"uuid">,
            email: comment.post.author.email,
            username: comment.post.author.username,
            nickname: comment.post.author.nickname ?? null,
            email_verified: comment.post.author.email_verified,
            registered_at: comment.post.author.registered_at.toISOString(),
            last_login_at:
              comment.post.author.last_login_at?.toISOString() ?? null,
          } satisfies ICommunityPlatformMember.ISummary,
          community: {
            id: comment.post.community.id as string & tags.Format<"uuid">,
            name: comment.post.community.name,
            description: comment.post.community.description,
            created_at: comment.post.community.created_at.toISOString(),
            owner: {
              id: comment.post.community.owner.id as string &
                tags.Format<"uuid">,
              email: comment.post.community.owner.email,
              username: comment.post.community.owner.username,
              nickname: comment.post.community.owner.nickname ?? null,
              email_verified: comment.post.community.owner.email_verified,
              registered_at:
                comment.post.community.owner.registered_at.toISOString(),
              last_login_at:
                comment.post.community.owner.last_login_at?.toISOString() ??
                null,
            } satisfies ICommunityPlatformMember.ISummary,
            subscriber_count: 0, // This should be fetched from materialized view
          } satisfies ICommunityPlatformCommunity.ISummary,
          vote_score: comment.post.vote_score,
          comment_count: comment.post.comment_count,
          created_at: comment.post.created_at.toISOString(),
          content_preview: comment.post.content_preview,
        } satisfies ICommunityPlatformPost.ISummary,
        parent: comment.parent
          ? ({
              id: comment.parent.id as string & tags.Format<"uuid">,
              content: comment.parent.content,
              voteScore: comment.parent.vote_score,
              createdAt: comment.parent.created_at.toISOString(),
              updatedAt: comment.parent.updated_at.toISOString(),
              deletedAt: comment.parent.deleted_at?.toISOString() ?? null,
              author: {
                id: comment.parent.author.id as string & tags.Format<"uuid">,
                email: comment.parent.author.email,
                username: comment.parent.author.username,
                nickname: comment.parent.author.nickname ?? null,
                email_verified: comment.parent.author.email_verified,
                registered_at:
                  comment.parent.author.registered_at.toISOString(),
                last_login_at:
                  comment.parent.author.last_login_at?.toISOString() ?? null,
              } satisfies ICommunityPlatformMember.ISummary,
              post: {
                id: comment.parent.post.id as string & tags.Format<"uuid">,
                title: comment.parent.post.title,
                author: {
                  id: comment.parent.post.author.id as string &
                    tags.Format<"uuid">,
                  email: comment.parent.post.author.email,
                  username: comment.parent.post.author.username,
                  nickname: comment.parent.post.author.nickname ?? null,
                  email_verified: comment.parent.post.author.email_verified,
                  registered_at:
                    comment.parent.post.author.registered_at.toISOString(),
                  last_login_at:
                    comment.parent.post.author.last_login_at?.toISOString() ??
                    null,
                } satisfies ICommunityPlatformMember.ISummary,
                community: {
                  id: comment.parent.post.community.id as string &
                    tags.Format<"uuid">,
                  name: comment.parent.post.community.name,
                  description: comment.parent.post.community.description,
                  created_at:
                    comment.parent.post.community.created_at.toISOString(),
                  owner: {
                    id: comment.parent.post.community.owner.id as string &
                      tags.Format<"uuid">,
                    email: comment.parent.post.community.owner.email,
                    username: comment.parent.post.community.owner.username,
                    nickname:
                      comment.parent.post.community.owner.nickname ?? null,
                    email_verified:
                      comment.parent.post.community.owner.email_verified,
                    registered_at:
                      comment.parent.post.community.owner.registered_at.toISOString(),
                    last_login_at:
                      comment.parent.post.community.owner.last_login_at?.toISOString() ??
                      null,
                  } satisfies ICommunityPlatformMember.ISummary,
                  subscriber_count: 0,
                } satisfies ICommunityPlatformCommunity.ISummary,
                vote_score: comment.parent.post.vote_score,
                comment_count: comment.parent.post.comment_count,
                created_at: comment.parent.post.created_at.toISOString(),
                content_preview: comment.parent.post.content_preview,
              } satisfies ICommunityPlatformPost.ISummary,
            } satisfies ICommunityPlatformComment.ISummary)
          : null,
      }) satisfies ICommunityPlatformComment.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageICommunityPlatformComment.ISummary;
}
