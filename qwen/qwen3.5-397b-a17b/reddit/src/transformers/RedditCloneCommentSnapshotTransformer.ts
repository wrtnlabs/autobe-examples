import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommentAtSummaryTransformer } from "./RedditCloneCommentAtSummaryTransformer";

export namespace RedditCloneCommentSnapshotTransformer {
  export type Payload = Prisma.reddit_clone_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        created_at: true,
        member: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar: true,
            created_at: true,
            karmaScore: {
              select: {
                score: true,
              },
            },
          },
        } satisfies Prisma.reddit_clone_membersFindManyArgs,
        post: {
          select: {
            id: true,
            title: true,
            post_type: true,
            created_at: true,
            member: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar: true,
                created_at: true,
                karmaScore: {
                  select: {
                    score: true,
                  },
                },
              },
            } satisfies Prisma.reddit_clone_membersFindManyArgs,
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
                subscriber_count: true,
                created_at: true,
                owner: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    avatar: true,
                    created_at: true,
                    karmaScore: {
                      select: {
                        score: true,
                      },
                    },
                  },
                } satisfies Prisma.reddit_clone_membersFindManyArgs,
              },
            } satisfies Prisma.reddit_clone_communitiesFindManyArgs,
            text: {
              select: {
                body: true,
              },
            } satisfies Prisma.reddit_clone_post_textsFindManyArgs,
            link: {
              select: {
                url: true,
              },
            } satisfies Prisma.reddit_clone_post_linksFindManyArgs,
            postImage: {
              select: {
                file_uri: true,
              },
            } satisfies Prisma.reddit_clone_post_imagesFindManyArgs,
            comments: {
              select: {
                id: true,
              },
            } satisfies Prisma.reddit_clone_commentsFindManyArgs,
          },
        } satisfies Prisma.reddit_clone_postsFindManyArgs,
        parentComment: RedditCloneCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommentSnapshot> {
    const postPreview = (() => {
      switch (input.post.post_type) {
        case "TEXT":
          return input.post.text?.body?.substring(0, 200) ?? "";
        case "LINK":
          return input.post.link?.url
            ? new URL(input.post.link.url).hostname
            : "";
        case "IMAGE":
          return input.post.postImage?.file_uri ?? "";
        default:
          return "";
      }
    })();
    return {
      id: input.id,
      body: input.body,
      created_at: input.created_at.toISOString(),
      member: {
        id: input.member.id,
        username: input.member.username,
        display_name: input.member.display_name,
        avatar: input.member.avatar ?? undefined,
        karma_score: input.member.karmaScore?.score ?? 0,
        created_at: input.member.created_at.toISOString(),
      },
      post: {
        id: input.post.id,
        title: input.post.title,
        post_type: input.post.post_type,
        author: {
          id: input.post.member.id,
          username: input.post.member.username,
          display_name: input.post.member.display_name,
          avatar: input.post.member.avatar ?? undefined,
          karma_score: input.post.member.karmaScore?.score ?? 0,
          created_at: input.post.member.created_at.toISOString(),
        },
        community: {
          id: input.post.community.id,
          name: input.post.community.name,
          description: input.post.community.description,
          icon: input.post.community.icon ?? null,
          subscriber_count: input.post.community.subscriber_count,
          created_at: input.post.community.created_at.toISOString(),
          owner: {
            id: input.post.community.owner.id,
            username: input.post.community.owner.username,
            display_name: input.post.community.owner.display_name,
            avatar: input.post.community.owner.avatar ?? undefined,
            karma_score: input.post.community.owner.karmaScore?.score ?? 0,
            created_at: input.post.community.owner.created_at.toISOString(),
          },
        },
        vote_score: 0,
        comment_count: input.post.comments.length,
        created_at: input.post.created_at.toISOString(),
        preview: postPreview,
      },
      parentComment: input.parentComment
        ? await RedditCloneCommentAtSummaryTransformer.transform(
            input.parentComment,
          )
        : null,
    };
  }
}
