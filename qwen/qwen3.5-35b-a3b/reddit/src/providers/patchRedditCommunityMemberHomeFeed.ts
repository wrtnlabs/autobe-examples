import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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

export async function patchRedditCommunityMemberHomeFeed(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search;
  const community_id: (string & tags.Format<"uuid">) | undefined =
    props.body.community_id;
  const subscriptions =
    await MyGlobal.prisma.reddit_community_subscriptions.findMany({
      where: {
        reddit_community_member_id: props.member.id,
        deleted_at: null,
      },
    });
  const subscribedCommunityIds: string[] = subscriptions.map(
    (sub) => sub.reddit_community_community_id,
  );
  if (subscribedCommunityIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const whereClause: Prisma.reddit_community_postsWhereInput = {
    community_id: { in: subscribedCommunityIds },
    deleted_at: null,
  };
  if (search !== undefined && search !== null) {
    whereClause.title = {
      contains: search,
    } satisfies Prisma.StringFilter;
  }
  if (community_id !== undefined) {
    whereClause.community_id = community_id;
  }
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_posts.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            created_at: true,
            karma: {
              select: { current_score: true },
            },
            userAvatarFiles: {
              select: { id: true, created_at: true },
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
            updated_at: true,
            deleted_at: true,
            owner: {
              select: {
                id: true,
                username: true,
                created_at: true,
                karma: true,
                userAvatarFiles: true,
              },
            },
            icon: {
              select: { file_id: true },
            },
          },
        },
        text: {
          select: { body: true },
        },
        link: {
          select: { url: true },
        },
        images: {
          select: {
            file: {
              select: { file_path: true },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_community_posts.count({
      where: whereClause,
    }),
  ]);
  const transformedPosts: IRedditCommunityPost.ISummary[] =
    await ArrayUtil.asyncMap(posts, async (post) => {
      const authorSummary: IRedditCommunityMember.ISummary = {
        id: post.author.id,
        username: post.author.username,
        created_at: toISOStringSafe(post.author.created_at),
        profile: undefined,
        karma: undefined,
      };
      const iconUrl: (string & tags.Format<"uri">) | undefined = post.community
        .icon?.file_id
        ? (`https://cdn.example.com/files/${post.community.icon.file_id}` as string &
            tags.Format<"uri">)
        : undefined;
      const communitySummary: IRedditCommunityCommunity.ISummary = {
        id: post.community.id,
        name: post.community.name,
        description: post.community.description ?? null,
        subscriber_count: post.community.subscriber_count,
        owner: {
          id: post.community.owner.id,
          username: post.community.owner.username,
          created_at: toISOStringSafe(post.community.owner.created_at),
          profile: undefined,
          karma: undefined,
        } satisfies IRedditCommunityMember.ISummary,
        created_at: toISOStringSafe(post.community.created_at),
        updated_at: toISOStringSafe(post.community.updated_at),
        deleted_at: post.community.deleted_at
          ? toISOStringSafe(post.community.deleted_at)
          : null,
        icon_url: iconUrl,
      } satisfies IRedditCommunityCommunity.ISummary;
      const postType: "text" | "link" | "image" = post.post_type as
        | "text"
        | "link"
        | "image";
      const previewContent: string | null = computePreviewContent({
        post_type: postType,
        text: post.text,
        link: post.link,
        images: post.images,
      });
      const result: IRedditCommunityPost.ISummary = {
        id: post.id,
        title: post.title,
        author: authorSummary,
        community: communitySummary,
        vote_score: post.vote_score,
        comment_count: post.comment_count,
        created_at: toISOStringSafe(post.created_at),
        post_type: postType,
        preview_content: previewContent,
      } satisfies IRedditCommunityPost.ISummary;
      return result;
    });
  const pages: number = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    data: transformedPosts,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
function computePreviewContent(post: {
  post_type: "text" | "link" | "image";
  text:
    | {
        body: string;
      }
    | null
    | undefined;
  link:
    | {
        url: string;
      }
    | null
    | undefined;
  images: {
    file: {
      file_path: string;
    };
  }[];
}): string | null {
  switch (post.post_type) {
    case "text":
      if (!post.text) return null;
      const body = post.text.body;
      return body.length > 200 ? body.substring(0, 200) + "..." : body;
    case "link":
      if (!post.link) return null;
      try {
        const url = new URL(post.link.url);
        return url.hostname;
      } catch {
        return null;
      }
    case "image":
      if (post.images.length === 0) return null;
      const firstImage = post.images[0];
      return firstImage.file?.file_path ?? null;
    default:
      return null;
  }
}
