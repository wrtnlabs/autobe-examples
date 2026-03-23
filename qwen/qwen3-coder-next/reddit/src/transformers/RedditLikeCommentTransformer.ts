import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeCommentTransformer {
  // 1. Payload type first
  export type Payload = Prisma.reddit_like_commentsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
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
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            type: true,
            content: true,
            url: true,
            image_url: true,
            score: true,
            comment_count: true,
            created_at: true,
            author: {
              select: {
                id: true,
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma_score: true,
                created_at: true,
              },
            },
            community: {
              select: {
                id: true,
                name: true,
                icon_url: true,
              },
            },
          },
        },
        parentComment: {
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
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma_score: true,
                created_at: true,
              },
            },
            post: {
              select: {
                id: true,
                title: true,
                type: true,
                content: true,
                url: true,
                image_url: true,
                score: true,
                comment_count: true,
                created_at: true,
                author: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    bio: true,
                    avatar_url: true,
                    karma_score: true,
                    created_at: true,
                  },
                },
                community: {
                  select: {
                    id: true,
                    name: true,
                    icon_url: true,
                  },
                },
              },
            },
            parentComment: {
              select: { id: true },
            },
          },
        },
        replies: {
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
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma_score: true,
                created_at: true,
              },
            },
            post: {
              select: {
                id: true,
                title: true,
                type: true,
                content: true,
                url: true,
                image_url: true,
                score: true,
                comment_count: true,
                created_at: true,
                author: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    bio: true,
                    avatar_url: true,
                    karma_score: true,
                    created_at: true,
                  },
                },
                community: {
                  select: {
                    id: true,
                    name: true,
                    icon_url: true,
                  },
                },
              },
            },
            parentComment: {
              select: { id: true },
            },
          },
        },
        votes: {
          select: { id: true },
        },
        votesSum: {
          select: { id: true },
        },
        revisions: {
          select: { id: true },
        },
        reports: {
          select: { id: true },
        },
      },
    } satisfies Prisma.reddit_like_commentsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(input: Payload): Promise<IRedditLikeComment> {
    const parentComment = input.parentComment
      ? await RedditLikeCommentTransformer.transform(input.parentComment)
      : null;
    const replies = await ArrayUtil.asyncMap(
      input.replies,
      RedditLikeCommentTransformer.transform,
    );
    return {
      id: input.id,
      content: input.content,
      vote_score: input.vote_score,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      author: {
        id: input.author.id,
        username: input.author.username,
        display_name: input.author.display_name,
        bio: input.author.bio ?? undefined,
        avatar_url: input.author.avatar_url ?? undefined,
        karma_score: input.author.karma_score,
        created_at: toISOStringSafe(input.author.created_at),
      } satisfies IRedditLikeMember.ISummary,
      post: {
        id: input.post.id,
        title: input.post.title,
        type: input.post.type as "text" | "link" | "image",
        content: input.post.content ?? undefined,
        url: input.post.url ?? undefined,
        imageUrl: input.post.image_url ?? undefined,
        author: {
          id: input.post.author.id,
          username: input.post.author.username,
          display_name: input.post.author.display_name,
          bio: input.post.author.bio ?? undefined,
          avatar_url: input.post.author.avatar_url ?? undefined,
          karma_score: input.post.author.karma_score,
          created_at: toISOStringSafe(input.post.author.created_at),
        } satisfies IRedditLikeMember.ISummary,
        community: {
          name: input.post.community.name,
          icon_url: input.post.community.icon_url ?? null,
          subscriber_count: 0,
        } satisfies IRedditLikeCommunity.ISummary,
        voteScore: input.post.score,
        commentCount: input.post.comment_count,
        createdAt: toISOStringSafe(input.post.created_at),
      } satisfies IRedditLikePost.ISummary,
      parentComment: parentComment,
      replies: replies,
    };
  }
}
