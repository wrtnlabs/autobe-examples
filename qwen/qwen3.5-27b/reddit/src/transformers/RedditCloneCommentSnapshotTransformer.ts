import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneCommentSnapshotTransformer {
  export type Payload = Prisma.reddit_clone_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        user_profile_id: true,
        reddit_clone_post_id: true,
        parent_comment_id: true,
        content: true,
        created_at: true,
        updated_at: true,
        snapshot_created_at: true,
        comment: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_clone_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommentSnapshot> {
    // Fetch userProfile from user_profile_id
    const userProfileRecord =
      await MyGlobal.prisma.reddit_clone_user_profiles.findFirstOrThrow({
        where: { id: input.user_profile_id },
        select: {
          id: true,
          display_name: true,
          bio: true,
          avatar: true,
          karma: true,
          created_at: true,
        },
      });
    const userProfile: IRedditCloneUserProfile.ISummary = {
      id: userProfileRecord.id,
      display_name: userProfileRecord.display_name,
      bio: userProfileRecord.bio,
      avatar: userProfileRecord.avatar,
      karma: userProfileRecord.karma,
      created_at: userProfileRecord.created_at.toISOString(),
    };
    // Fetch post from reddit_clone_post_id
    const postRecord =
      await MyGlobal.prisma.reddit_clone_posts.findFirstOrThrow({
        where: { id: input.reddit_clone_post_id },
        select: {
          id: true,
          title: true,
          post_type: true,
          text_content: true,
          link_url: true,
          image_url: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          userProfile: {
            select: {
              id: true,
              display_name: true,
              bio: true,
              avatar: true,
              karma: true,
              created_at: true,
            },
          },
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
                  display_name: true,
                  bio: true,
                  avatar: true,
                  karma: true,
                  created_at: true,
                },
              },
              _count: {
                select: {
                  subscriptions: true,
                },
              },
            },
          },
          postVotes: {
            select: {
              vote_type: true,
            },
          } satisfies Prisma.reddit_clone_post_votesFindManyArgs,
          comments: {
            select: {
              deleted_at: true,
            },
          } satisfies Prisma.reddit_clone_commentsFindManyArgs,
        },
      });
    // Transform post author
    const postAuthor: IRedditCloneUserProfile.ISummary = {
      id: postRecord.userProfile.id,
      display_name: postRecord.userProfile.display_name,
      bio: postRecord.userProfile.bio,
      avatar: postRecord.userProfile.avatar,
      karma: postRecord.userProfile.karma,
      created_at: postRecord.userProfile.created_at.toISOString(),
    };
    // Transform post community owner
    const communityOwner: IRedditCloneUserProfile.ISummary = {
      id: postRecord.community.owner.id,
      display_name: postRecord.community.owner.display_name,
      bio: postRecord.community.owner.bio,
      avatar: postRecord.community.owner.avatar,
      karma: postRecord.community.owner.karma,
      created_at: postRecord.community.owner.created_at.toISOString(),
    };
    // Transform post community
    const postCommunity: IRedditCloneCommunity.ISummary = {
      id: postRecord.community.id,
      name: postRecord.community.name,
      description: postRecord.community.description,
      icon: postRecord.community.icon,
      owner: communityOwner,
      subscriber_count: postRecord.community._count.subscriptions,
      created_at: postRecord.community.created_at.toISOString(),
    };
    // Compute post vote_score
    const postVoteScore = postRecord.postVotes.reduce((sum, vote) => {
      return vote.vote_type === "upvote" ? sum + 1 : sum - 1;
    }, 0);
    // Compute post comment_count
    const postCommentCount = postRecord.comments.filter(
      (c) => c.deleted_at === null,
    ).length;
    // Compute post preview
    let postPreview = "";
    if (postRecord.post_type === "text") {
      const content = postRecord.text_content ?? "";
      postPreview =
        content.length > 200 ? content.substring(0, 200) + "..." : content;
    } else if (postRecord.post_type === "image") {
      postPreview = postRecord.image_url ?? "";
    } else if (postRecord.post_type === "link") {
      try {
        const url = new URL(postRecord.link_url ?? "");
        postPreview = url.hostname;
      } catch {
        postPreview = postRecord.link_url ?? "";
      }
    }
    const post: IRedditClonePost.ISummary = {
      id: postRecord.id,
      title: postRecord.title,
      post_type: postRecord.post_type,
      author: postAuthor,
      community: postCommunity,
      vote_score: postVoteScore,
      comment_count: postCommentCount,
      created_at: postRecord.created_at.toISOString(),
      preview: postPreview,
    };
    // Fetch parentComment from parent_comment_id (nullable)
    const parentComment: IRedditCloneComment.ISummary | null =
      input.parent_comment_id
        ? await MyGlobal.prisma.reddit_clone_comments
            .findFirst({
              where: { id: input.parent_comment_id },
              select: {
                id: true,
                content: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                userProfile: {
                  select: {
                    id: true,
                    display_name: true,
                    bio: true,
                    avatar: true,
                    karma: true,
                    created_at: true,
                  },
                },
                post: {
                  select: {
                    id: true,
                    title: true,
                    post_type: true,
                    text_content: true,
                    link_url: true,
                    image_url: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    userProfile: {
                      select: {
                        id: true,
                        display_name: true,
                        bio: true,
                        avatar: true,
                        karma: true,
                        created_at: true,
                      },
                    },
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
                            display_name: true,
                            bio: true,
                            avatar: true,
                            karma: true,
                            created_at: true,
                          },
                        },
                        _count: {
                          select: {
                            subscriptions: true,
                          },
                        },
                      },
                    },
                    postVotes: {
                      select: {
                        vote_type: true,
                      },
                    } satisfies Prisma.reddit_clone_post_votesFindManyArgs,
                    comments: {
                      select: {
                        deleted_at: true,
                      },
                    } satisfies Prisma.reddit_clone_commentsFindManyArgs,
                  },
                },
                parent_comment_id: true,
                replies: {
                  select: { id: true },
                } satisfies Prisma.reddit_clone_commentsFindManyArgs,
                votes: {
                  select: { vote_type: true },
                } satisfies Prisma.reddit_clone_comment_votesFindManyArgs,
              },
            })
            .then((parentRecord) => {
              if (!parentRecord) return null;
              // Transform parent comment author
              const parentAuthor: IRedditCloneUserProfile.ISummary = {
                id: parentRecord.userProfile.id,
                display_name: parentRecord.userProfile.display_name,
                bio: parentRecord.userProfile.bio,
                avatar: parentRecord.userProfile.avatar,
                karma: parentRecord.userProfile.karma,
                created_at: parentRecord.userProfile.created_at.toISOString(),
              };
              // Transform parent comment post author
              const parentPostAuthor: IRedditCloneUserProfile.ISummary = {
                id: parentRecord.post.userProfile.id,
                display_name: parentRecord.post.userProfile.display_name,
                bio: parentRecord.post.userProfile.bio,
                avatar: parentRecord.post.userProfile.avatar,
                karma: parentRecord.post.userProfile.karma,
                created_at:
                  parentRecord.post.userProfile.created_at.toISOString(),
              };
              // Transform parent comment post community owner
              const parentCommunityOwner: IRedditCloneUserProfile.ISummary = {
                id: parentRecord.post.community.owner.id,
                display_name: parentRecord.post.community.owner.display_name,
                bio: parentRecord.post.community.owner.bio,
                avatar: parentRecord.post.community.owner.avatar,
                karma: parentRecord.post.community.owner.karma,
                created_at:
                  parentRecord.post.community.owner.created_at.toISOString(),
              };
              // Transform parent comment post community
              const parentPostCommunity: IRedditCloneCommunity.ISummary = {
                id: parentRecord.post.community.id,
                name: parentRecord.post.community.name,
                description: parentRecord.post.community.description,
                icon: parentRecord.post.community.icon,
                owner: parentCommunityOwner,
                subscriber_count:
                  parentRecord.post.community._count.subscriptions,
                created_at:
                  parentRecord.post.community.created_at.toISOString(),
              };
              // Compute parent comment post vote_score
              const parentPostVoteScore = parentRecord.post.postVotes.reduce(
                (sum, vote) => {
                  return vote.vote_type === "upvote" ? sum + 1 : sum - 1;
                },
                0,
              );
              // Compute parent comment post comment_count
              const parentPostCommentCount = parentRecord.post.comments.filter(
                (c) => c.deleted_at === null,
              ).length;
              // Compute parent comment post preview
              let parentPostPreview = "";
              if (parentRecord.post.post_type === "text") {
                const content = parentRecord.post.text_content ?? "";
                parentPostPreview =
                  content.length > 200
                    ? content.substring(0, 200) + "..."
                    : content;
              } else if (parentRecord.post.post_type === "image") {
                parentPostPreview = parentRecord.post.image_url ?? "";
              } else if (parentRecord.post.post_type === "link") {
                try {
                  const url = new URL(parentRecord.post.link_url ?? "");
                  parentPostPreview = url.hostname;
                } catch {
                  parentPostPreview = parentRecord.post.link_url ?? "";
                }
              }
              const parentPost: IRedditClonePost.ISummary = {
                id: parentRecord.post.id,
                title: parentRecord.post.title,
                post_type: parentRecord.post.post_type,
                author: parentPostAuthor,
                community: parentPostCommunity,
                vote_score: parentPostVoteScore,
                comment_count: parentPostCommentCount,
                created_at: parentRecord.post.created_at.toISOString(),
                preview: parentPostPreview,
              };
              // Compute parent comment vote_score
              const parentVoteScore = parentRecord.votes.reduce(
                (sum, v) => sum + (v.vote_type === "upvote" ? 1 : -1),
                0,
              );
              // Compute parent comment reply_count
              const parentReplyCount = parentRecord.replies.length;
              return {
                id: parentRecord.id,
                content: parentRecord.content,
                author: parentAuthor,
                post: parentPost,
                parentComment: null, // Don't recurse further
                vote_score: parentVoteScore,
                reply_count: parentReplyCount,
                created_at: parentRecord.created_at.toISOString(),
                updated_at: parentRecord.updated_at.toISOString(),
                deleted_at: parentRecord.deleted_at?.toISOString() ?? null,
              };
            })
        : null;
    return {
      id: input.id,
      reddit_clone_comment_id: input.comment.id,
      userProfile,
      post,
      parentComment,
      content: input.content,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      snapshot_created_at: input.snapshot_created_at.toISOString(),
    };
  }
}
