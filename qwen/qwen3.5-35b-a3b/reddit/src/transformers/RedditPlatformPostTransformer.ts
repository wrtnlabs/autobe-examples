import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformPostTransformer {
  export type Payload = Prisma.reddit_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        post_type: true,
        url: true,
        image_url: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: {
          select: {
            id: true,
            username: true,
            display_name: true,
            karma_score: true,
            is_active: true,
            created_at: true,
          },
        } satisfies Prisma.reddit_platform_membersFindManyArgs,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
            created_at: true,
            owner: {
              select: {
                id: true,
                username: true,
                display_name: true,
                karma_score: true,
                is_active: true,
                created_at: true,
              },
            } satisfies Prisma.reddit_platform_membersFindManyArgs,
          },
        } satisfies Prisma.reddit_platform_communitiesFindManyArgs,
        postVotes: true,
        comments: true,
        snapshots: true,
        images: true,
        engagementStats: true,
      },
    } satisfies Prisma.reddit_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPost> {
    return {
      id: input.id,
      title: input.title,
      content: input.content ?? undefined,
      post_type: typia.assert<"TEXT" | "LINK" | "IMAGE">(input.post_type),
      url: input.url ?? undefined,
      image_url: input.image_url ?? undefined,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      reddit_platform_member_id: input.author.id,
      reddit_platform_community_id: input.community.id,
      author: {
        id: input.author.id,
        username: input.author.username,
        display_name: input.author.display_name,
        karma_score: Number(input.author.karma_score),
        is_active: input.author.is_active,
        created_at: input.author.created_at.toISOString(),
      } satisfies IRedditPlatformMember.ISummary,
      community: {
        id: input.community.id,
        name: input.community.name,
        description: input.community.description,
        icon_url: input.community.icon_url,
        subscriber_count: input.community.subscriber_count,
        created_at: input.community.created_at.toISOString(),
        owner: {
          id: input.community.owner.id,
          username: input.community.owner.username,
          display_name: input.community.owner.display_name,
          karma_score: Number(input.community.owner.karma_score),
          is_active: input.community.owner.is_active,
          created_at: input.community.owner.created_at.toISOString(),
        } satisfies IRedditPlatformMember.ISummary,
      } satisfies IRedditPlatformCommunity.ISummary,
      votes: await ArrayUtil.asyncMap(input.postVotes, async (vote) => ({
        id: vote.id,
        vote_type: vote.vote_type,
        created_at: vote.created_at.toISOString(),
        updated_at: vote.updated_at.toISOString(),
        deleted_at: vote.deleted_at?.toISOString() ?? null,
        user: {
          id: vote.user.id,
          username: vote.user.username,
          display_name: vote.user.display_name,
          karma_score: Number(vote.user.karma_score),
          is_active: vote.user.is_active,
          created_at: vote.user.created_at.toISOString(),
        } satisfies IRedditPlatformMember.ISummary,
        post: {
          id: vote.post.id,
          title: vote.post.title,
          post_type: vote.post.post_type,
          vote_score: vote.post.vote_score,
          comment_count: vote.post.comment_count,
          author: {
            id: vote.post.author.id,
            username: vote.post.author.username,
            display_name: vote.post.author.display_name,
            karma_score: Number(vote.post.author.karma_score),
            is_active: vote.post.author.is_active,
            created_at: vote.post.author.created_at.toISOString(),
          } satisfies IRedditPlatformMember.ISummary,
          community: {
            id: vote.post.community.id,
            name: vote.post.community.name,
            description: vote.post.community.description,
            icon_url: vote.post.community.icon_url,
            subscriber_count: vote.post.community.subscriber_count,
            created_at: vote.post.community.created_at.toISOString(),
            owner: {
              id: vote.post.community.owner.id,
              username: vote.post.community.owner.username,
              display_name: vote.post.community.owner.display_name,
              karma_score: Number(vote.post.community.owner.karma_score),
              is_active: vote.post.community.owner.is_active,
              created_at: vote.post.community.owner.created_at.toISOString(),
            } satisfies IRedditPlatformMember.ISummary,
          } satisfies IRedditPlatformCommunity.ISummary,
        } satisfies IRedditPlatformPost.ISummary,
      })),
      comments: await ArrayUtil.asyncMap(input.comments, async (comment) => ({
        id: comment.id,
        content: comment.content,
        vote_score: comment.vote_score,
        author: {
          id: comment.author.id,
          username: comment.author.username,
          display_name: comment.author.display_name,
          karma_score: Number(comment.author.karma_score),
          is_active: comment.author.is_active,
          created_at: comment.author.created_at.toISOString(),
        } satisfies IRedditPlatformMember.ISummary,
        post: comment.post
          ? ({
              id: comment.post.id,
              title: comment.post.title,
              post_type: comment.post.post_type,
              vote_score: comment.post.vote_score,
              comment_count: comment.post.comment_count,
              author: {
                id: comment.post.author.id,
                username: comment.post.author.username,
                display_name: comment.post.author.display_name,
                karma_score: Number(comment.post.author.karma_score),
                is_active: comment.post.author.is_active,
                created_at: comment.post.author.created_at.toISOString(),
              } satisfies IRedditPlatformMember.ISummary,
              community: {
                id: comment.post.community.id,
                name: comment.post.community.name,
                description: comment.post.community.description,
                icon_url: comment.post.community.icon_url,
                subscriber_count: comment.post.community.subscriber_count,
                created_at: comment.post.community.created_at.toISOString(),
                owner: {
                  id: comment.post.community.owner.id,
                  username: comment.post.community.owner.username,
                  display_name: comment.post.community.owner.display_name,
                  karma_score: Number(comment.post.community.owner.karma_score),
                  is_active: comment.post.community.owner.is_active,
                  created_at:
                    comment.post.community.owner.created_at.toISOString(),
                } satisfies IRedditPlatformMember.ISummary,
              } satisfies IRedditPlatformCommunity.ISummary,
            } satisfies IRedditPlatformPost.ISummary)
          : null,
        parent: comment.parent
          ? ({
              id: comment.parent.id,
              content: comment.parent.content,
              vote_score: comment.parent.vote_score,
              author: {
                id: comment.parent.author.id,
                username: comment.parent.author.username,
                display_name: comment.parent.author.display_name,
                karma_score: Number(comment.parent.author.karma_score),
                is_active: comment.parent.author.is_active,
                created_at: comment.parent.author.created_at.toISOString(),
              } satisfies IRedditPlatformMember.ISummary,
              post: comment.parent.post
                ? ({
                    id: comment.parent.post.id,
                    title: comment.parent.post.title,
                    post_type: comment.parent.post.post_type,
                    vote_score: comment.parent.post.vote_score,
                    comment_count: comment.parent.post.comment_count,
                    author: {
                      id: comment.parent.post.author.id,
                      username: comment.parent.post.author.username,
                      display_name: comment.parent.post.author.display_name,
                      karma_score: Number(
                        comment.parent.post.author.karma_score,
                      ),
                      is_active: comment.parent.post.author.is_active,
                      created_at:
                        comment.parent.post.author.created_at.toISOString(),
                    } satisfies IRedditPlatformMember.ISummary,
                    community: {
                      id: comment.parent.post.community.id,
                      name: comment.parent.post.community.name,
                      description: comment.parent.post.community.description,
                      icon_url: comment.parent.post.community.icon_url,
                      subscriber_count:
                        comment.parent.post.community.subscriber_count,
                      created_at:
                        comment.parent.post.community.created_at.toISOString(),
                      owner: {
                        id: comment.parent.post.community.owner.id,
                        username: comment.parent.post.community.owner.username,
                        display_name:
                          comment.parent.post.community.owner.display_name,
                        karma_score: Number(
                          comment.parent.post.community.owner.karma_score,
                        ),
                        is_active:
                          comment.parent.post.community.owner.is_active,
                        created_at:
                          comment.parent.post.community.owner.created_at.toISOString(),
                      } satisfies IRedditPlatformMember.ISummary,
                    } satisfies IRedditPlatformCommunity.ISummary,
                  } satisfies IRedditPlatformPost.ISummary)
                : null,
              parent: null,
              replies: [],
              created_at: comment.parent.created_at.toISOString(),
              updated_at: comment.parent.updated_at.toISOString(),
              deleted_at: comment.parent.deleted_at?.toISOString() ?? null,
            } satisfies IRedditPlatformComment.ISummary)
          : null,
        replies: [],
        created_at: comment.created_at.toISOString(),
        updated_at: comment.updated_at.toISOString(),
        deleted_at: comment.deleted_at?.toISOString() ?? null,
      })),
      snapshots: await ArrayUtil.asyncMap(
        input.snapshots,
        async (snapshot) => ({
          id: snapshot.id,
          reddit_platform_post_id: snapshot.reddit_platform_post_id,
          author: {
            id: snapshot.author.id,
            username: snapshot.author.username,
            display_name: snapshot.author.display_name,
            karma_score: Number(snapshot.author.karma_score),
            is_active: snapshot.author.is_active,
            created_at: snapshot.author.created_at.toISOString(),
          } satisfies IRedditPlatformMember.ISummary,
          title: snapshot.title,
          content: snapshot.content ?? undefined,
          post_type: typia.assert<"TEXT" | "LINK" | "IMAGE">(
            snapshot.post_type,
          ),
          url: snapshot.url ?? undefined,
          image_url: snapshot.image_url ?? undefined,
          vote_score: snapshot.vote_score,
          comment_count: snapshot.comment_count,
          snapshot_type: typia.assert<"CREATE" | "EDIT" | "DELETE">(
            snapshot.snapshot_type,
          ),
          created_at: snapshot.created_at.toISOString(),
        }),
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        async (
          image: Prisma.reddit_platform_post_imagesGetPayload<{
            select: {
              id: true;
              filename: true;
              mime_type: true;
              file_size: true;
              file_path: true;
              created_at: true;
              updated_at: true;
              deleted_at: true;
              post: {
                select: {
                  id: true;
                  title: true;
                  content: true;
                  post_type: true;
                  url: true;
                  image_url: true;
                  vote_score: true;
                  comment_count: true;
                  created_at: true;
                  updated_at: true;
                  deleted_at: true;
                  author: {
                    select: {
                      id: true;
                      username: true;
                      display_name: true;
                      karma_score: true;
                      is_active: true;
                      created_at: true;
                    };
                  };
                  community: {
                    select: {
                      id: true;
                      name: true;
                      description: true;
                      icon_url: true;
                      subscriber_count: true;
                      created_at: true;
                      owner: {
                        select: {
                          id: true;
                          username: true;
                          display_name: true;
                          karma_score: true;
                          is_active: true;
                          created_at: true;
                        };
                      };
                    };
                  };
                };
              };
            };
          }>,
        ) => ({
          id: image.id,
          post: {
            id: image.post.id,
            title: image.post.title,
            post_type: image.post.post_type,
            vote_score: image.post.vote_score,
            comment_count: image.post.comment_count,
            author: {
              id: image.post.author.id,
              username: image.post.author.username,
              display_name: image.post.author.display_name,
              karma_score: Number(image.post.author.karma_score),
              is_active: image.post.author.is_active,
              created_at: image.post.author.created_at.toISOString(),
            } satisfies IRedditPlatformMember.ISummary,
            community: {
              id: image.post.community.id,
              name: image.post.community.name,
              description: image.post.community.description,
              icon_url: image.post.community.icon_url,
              subscriber_count: image.post.community.subscriber_count,
              created_at: image.post.community.created_at.toISOString(),
              owner: {
                id: image.post.community.owner.id,
                username: image.post.community.owner.username,
                display_name: image.post.community.owner.display_name,
                karma_score: Number(image.post.community.owner.karma_score),
                is_active: image.post.community.owner.is_active,
                created_at: image.post.community.owner.created_at.toISOString(),
              } satisfies IRedditPlatformMember.ISummary,
            } satisfies IRedditPlatformCommunity.ISummary,
          } satisfies IRedditPlatformPost.ISummary,
          filename: image.filename,
          mime_type: image.mime_type,
          file_size: image.file_size,
          file_path: image.file_path,
          created_at: image.created_at.toISOString(),
          updated_at: image.updated_at.toISOString(),
          deleted_at: image.deleted_at?.toISOString() ?? null,
        }),
      ),
      engagement_stats: await ArrayUtil.asyncMap(
        input.engagementStats,
        async (stat) => ({
          id: stat.id,
          karma_score: stat.karma_score,
        }),
      ),
    };
  }
}
