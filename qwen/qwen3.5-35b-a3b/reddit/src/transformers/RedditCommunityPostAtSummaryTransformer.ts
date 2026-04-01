import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityPostAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
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
            karma: {
              select: { current_score: true },
            } satisfies Prisma.reddit_community_user_karmasFindManyArgs,
            userAvatarFiles: {
              select: {
                id: true,
                created_at: true,
              },
            } satisfies Prisma.reddit_community_file_of_usersFindManyArgs,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            subscriber_count: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            owner: {
              select: {
                id: true,
                created_at: true,
                username: true,
                karma: true,
                userAvatarFiles: true,
              },
            },
            icon: {
              select: {
                file_id: true,
              },
            },
          },
        } satisfies Prisma.reddit_community_communitiesFindManyArgs,
        text: {
          select: { body: true },
        } satisfies Prisma.reddit_community_post_textsFindManyArgs,
        link: {
          select: { url: true },
        } satisfies Prisma.reddit_community_post_linksFindManyArgs,
        snapshots: {
          select: { id: true },
        } satisfies Prisma.reddit_community_post_snapshotsFindManyArgs,
        deletion: {
          select: { id: true },
        } satisfies Prisma.reddit_community_post_deletionsFindManyArgs,
        comments: {
          select: { id: true },
        } satisfies Prisma.reddit_community_commentsFindManyArgs,
        commentSnapshots: {
          select: { id: true },
        } satisfies Prisma.reddit_community_comment_snapshotsFindManyArgs,
        votes: {
          select: { id: true },
        } satisfies Prisma.reddit_community_votesFindManyArgs,
        voteOfPosts: {
          select: { id: true },
        } satisfies Prisma.reddit_community_vote_of_postsFindManyArgs,
        feedCacheEntries: {
          select: { id: true },
        } satisfies Prisma.reddit_community_feed_cachesFindManyArgs,
        sortingMetric: {
          select: { id: true },
        } satisfies Prisma.reddit_community_feed_sorting_metricsFindManyArgs,
        images: {
          select: {
            file: { select: { file_path: true } },
          },
        } satisfies Prisma.reddit_community_file_of_postsFindManyArgs,
        systemLogs: {
          select: { id: true },
        } satisfies Prisma.reddit_community_system_logsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPost.ISummary> {
    const author = transformAuthor(input.author);
    const community = transformCommunity(input.community);
    const previewContent = computePreviewContent(input);
    return {
      id: input.id,
      title: input.title,
      author: author,
      community: community,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      created_at: toISOStringSafe(input.created_at),
      post_type: input.post_type as "text" | "link" | "image",
      preview_content: previewContent,
    };
  }
  function transformAuthor(
    author: Payload["author"],
  ): IRedditCommunityMember.ISummary {
    const file = author.userAvatarFiles?.[0] ?? undefined;
    return {
      id: author.id,
      username: author.username,
      created_at: toISOStringSafe(author.created_at),
      profile:
        file !== undefined
          ? {
              id: file.id,
              display_name: "",
              bio: "",
              avatar_image_url: "",
              karma_score: 0,
              created_at: toISOStringSafe(file.created_at),
            }
          : undefined,
      karma:
        author.karma !== undefined && author.karma !== null
          ? Number(author.karma.current_score)
          : undefined,
    };
  }
  function transformCommunity(
    community: Payload["community"],
  ): IRedditCommunityCommunity.ISummary {
    const iconUrl = community.icon?.file_id
      ? `https://cdn.example.com/files/${community.icon.file_id}`
      : undefined;
    return {
      id: community.id,
      name: community.name,
      description: community.description ?? null,
      subscriber_count: community.subscriber_count,
      owner: transformAuthor(community.owner as Payload["author"]),
      created_at: toISOStringSafe(community.created_at),
      updated_at: toISOStringSafe(community.updated_at),
      deleted_at: community.deleted_at
        ? toISOStringSafe(community.deleted_at)
        : null,
      icon_url: iconUrl,
    };
  }
  function computePreviewContent(input: Payload): string | null {
    switch (input.post_type) {
      case "text":
        if (!input.text) return null;
        const body = input.text.body;
        return body.length > 200 ? body.substring(0, 200) + "..." : body;
      case "link":
        if (!input.link) return null;
        try {
          const url = new URL(input.link.url);
          return url.hostname;
        } catch {
          return null;
        }
      case "image":
        if (!input.images || input.images.length === 0) return null;
        const firstImage = input.images[0];
        return firstImage.file?.file_path ?? null;
      default:
        return null;
    }
  }
}
