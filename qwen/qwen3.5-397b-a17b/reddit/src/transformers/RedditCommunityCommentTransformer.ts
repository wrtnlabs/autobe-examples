import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityCommentTransformer {
  export type Payload = Prisma.reddit_community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            username: true,
            display_name: true,
            bio: true,
            avatar: true,
            karma: true,
            created_at: true,
          },
        } satisfies Prisma.reddit_community_membersFindManyArgs,
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
                bio: true,
                avatar: true,
                karma: true,
                created_at: true,
              },
            } satisfies Prisma.reddit_community_membersFindManyArgs,
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
                created_at: true,
                owner: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    bio: true,
                    avatar: true,
                    karma: true,
                    created_at: true,
                  },
                } satisfies Prisma.reddit_community_membersFindManyArgs,
                _count: {
                  select: {
                    subscriptions: true,
                  },
                },
              },
            } satisfies Prisma.reddit_community_communitiesFindManyArgs,
            votes: {
              select: {
                value: true,
              },
            } satisfies Prisma.reddit_community_post_votesFindManyArgs,
            comments: {
              select: {
                id: true,
              },
            } satisfies Prisma.reddit_community_commentsFindManyArgs,
            _count: {
              select: {
                comments: true,
              },
            },
          },
        } satisfies Prisma.reddit_community_postsFindManyArgs,
        parent: {
          select: {
            id: true,
            content: true,
            created_at: true,
            member: {
              select: {
                id: true,
                username: true,
                display_name: true,
                bio: true,
                avatar: true,
                karma: true,
                created_at: true,
              },
            } satisfies Prisma.reddit_community_membersFindManyArgs,
            votes: {
              select: {
                value: true,
              },
            } satisfies Prisma.reddit_community_comment_votesFindManyArgs,
            replies: {
              select: {
                id: true,
              },
            } satisfies Prisma.reddit_community_commentsFindManyArgs,
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
                    bio: true,
                    avatar: true,
                    karma: true,
                    created_at: true,
                  },
                } satisfies Prisma.reddit_community_membersFindManyArgs,
                community: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    icon: true,
                    created_at: true,
                    owner: {
                      select: {
                        id: true,
                        username: true,
                        display_name: true,
                        bio: true,
                        avatar: true,
                        karma: true,
                        created_at: true,
                      },
                    } satisfies Prisma.reddit_community_membersFindManyArgs,
                    _count: {
                      select: {
                        subscriptions: true,
                      },
                    },
                  },
                } satisfies Prisma.reddit_community_communitiesFindManyArgs,
                votes: {
                  select: {
                    value: true,
                  },
                } satisfies Prisma.reddit_community_post_votesFindManyArgs,
                comments: {
                  select: {
                    id: true,
                  },
                } satisfies Prisma.reddit_community_commentsFindManyArgs,
                _count: {
                  select: {
                    comments: true,
                  },
                },
              },
            } satisfies Prisma.reddit_community_postsFindManyArgs,
          },
        } satisfies Prisma.reddit_community_commentsFindManyArgs,
        votes: {
          select: {
            value: true,
          },
        } satisfies Prisma.reddit_community_comment_votesFindManyArgs,
        replies: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_commentsFindManyArgs,
        reports: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_report_of_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    childrenCache: VariadicSingleton<
      Promise<IRedditCommunityComment[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IRedditCommunityComment> {
    return {
      id: input.id,
      author: {
        id: input.member.id,
        username: input.member.username,
        display_name: input.member.display_name,
        bio: input.member.bio,
        avatar: input.member.avatar,
        karma: input.member.karma,
        created_at: input.member.created_at.toISOString(),
      } satisfies IRedditCommunityMember.ISummary,
      parent: input.parent
        ? ({
            id: input.parent.id,
            author: {
              id: input.parent.member.id,
              username: input.parent.member.username,
              display_name: input.parent.member.display_name,
              bio: input.parent.member.bio,
              avatar: input.parent.member.avatar,
              karma: input.parent.member.karma,
              created_at: input.parent.member.created_at.toISOString(),
            } satisfies IRedditCommunityMember.ISummary,
            content: input.parent.content,
            voteScore: input.parent.votes.reduce(
              (sum, v) => sum + v.value,
              0,
            ) satisfies number as number & tags.Type<"int32">,
            createdAt: input.parent.created_at.toISOString(),
            repliesCount: input.parent.replies
              .length satisfies number as number & tags.Type<"int32">,
            post: {
              id: input.parent.post.id,
              title: input.parent.post.title,
              post_type: input.parent.post.post_type as
                | "text"
                | "link"
                | "image",
              author: {
                id: input.parent.post.member.id,
                username: input.parent.post.member.username,
                display_name: input.parent.post.member.display_name,
                bio: input.parent.post.member.bio,
                avatar: input.parent.post.member.avatar,
                karma: input.parent.post.member.karma,
                created_at: input.parent.post.member.created_at.toISOString(),
              } satisfies IRedditCommunityMember.ISummary,
              community: {
                id: input.parent.post.community.id,
                name: input.parent.post.community.name,
                description: input.parent.post.community.description,
                icon: input.parent.post.community.icon,
                owner: {
                  id: input.parent.post.community.owner.id,
                  username: input.parent.post.community.owner.username,
                  display_name: input.parent.post.community.owner.display_name,
                  bio: input.parent.post.community.owner.bio,
                  avatar: input.parent.post.community.owner.avatar,
                  karma: input.parent.post.community.owner.karma,
                  created_at:
                    input.parent.post.community.owner.created_at.toISOString(),
                } satisfies IRedditCommunityMember.ISummary,
                subscribers_count: input.parent.post.community._count
                  .subscriptions satisfies number as number &
                  tags.Type<"int32">,
                created_at:
                  input.parent.post.community.created_at.toISOString(),
              } satisfies IRedditCommunityCommunity.ISummary,
              vote_score: input.parent.post.votes.reduce(
                (sum, v) => sum + v.value,
                0,
              ) satisfies number as number & tags.Type<"int32">,
              comment_count: input.parent.post._count
                .comments satisfies number as number & tags.Type<"int32">,
              created_at: input.parent.post.created_at.toISOString(),
            } satisfies IRedditCommunityPost.ISummary,
          } satisfies IRedditCommunityComment.ISummary)
        : null,
      content: input.content,
      vote_score: input.votes.reduce((sum, v) => sum + v.value, 0),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      replies: await childrenCache.get(input.id),
    } satisfies IRedditCommunityComment;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IRedditCommunityComment[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<IRedditCommunityComment[]> => {
        const records =
          await MyGlobal.prisma.reddit_community_comments.findMany({
            ...select(),
            where: { reddit_community_comment_id: parentId },
          });
        return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
      },
    );
    return cache;
  }
}
