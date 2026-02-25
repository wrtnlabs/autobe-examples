import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityCommunitiesCommunityNamePosts(props: {
  communityName: string;
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  // 1. Look up community by name (case-insensitive, not soft-deleted)
  const community = await MyGlobal.prisma.community_communities.findFirst({
    where: {
      name: { equals: props.communityName, mode: "insensitive" as const },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 25, 10), 100);
  const skip = (page - 1) * limit;
  // 3. Determine sort and time parameters
  const sort = props.body.sort ?? "hot";
  const time = props.body.time ?? "all";
  // 4. Build WHERE clause
  const whereInput = {
    community_id: community.id,
    is_deleted: false,
    ...(props.body.search && {
      OR: [
        {
          title: { contains: props.body.search, mode: "insensitive" as const },
        },
        {
          text_content: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.postType && { post_type: props.body.postType }),
    ...(sort === "top" &&
      time !== "all" && {
        created_at: { gte: computeTimeThreshold(time) },
      }),
  } satisfies Prisma.community_postsWhereInput;
  // 5. Build ORDER BY clause
  const orderByInput = (
    sort === "new"
      ? { created_at: "desc" as const }
      : sort === "top"
        ? { vote_score: "desc" as const }
        : sort === "controversial"
          ? { controversy_score: "desc" as const }
          : { hot_score: "desc" as const }
  ) satisfies Prisma.community_postsOrderByWithRelationInput;
  // 6. Query posts with pagination
  const posts = await MyGlobal.prisma.community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      post_type: true,
      text_content: true,
      link_url: true,
      image_thumbnail_url: true,
      vote_score: true,
      comment_count: true,
      edited_at: true,
      created_at: true,
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          karma: true,
          created_at: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          subscriber_count: true,
          created_at: true,
        },
      },
    },
  });
  // 7. Get total count
  const total = await MyGlobal.prisma.community_posts.count({
    where: whereInput,
  });
  // 8. Transform posts to ISummary format
  const data = await Promise.all(posts.map(transformPost));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityPost.ISummary;
}
function computeTimeThreshold(time: string): string {
  const nowMs = Date.now();
  let ms: number;
  switch (time) {
    case "today":
      ms = 24 * 60 * 60 * 1000;
      break;
    case "week":
      ms = 7 * 24 * 60 * 60 * 1000;
      break;
    case "month":
      ms = 30 * 24 * 60 * 60 * 1000;
      break;
    case "year":
      ms = 365 * 24 * 60 * 60 * 1000;
      break;
    default:
      return new Date(0).toISOString();
  }
  return new Date(nowMs - ms).toISOString();
}
interface IPostRecord {
  id: string;
  title: string;
  post_type: string;
  text_content: string | null;
  link_url: string | null;
  image_thumbnail_url: string | null;
  vote_score: number;
  comment_count: number;
  edited_at: Date | null;
  created_at: Date;
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    karma: number;
    created_at: Date;
  };
  community: {
    id: string;
    name: string;
    description: string;
    icon_url: string | null;
    subscriber_count: number;
    created_at: Date;
  };
}
async function transformPost(
  record: IPostRecord,
): Promise<ICommunityPost.ISummary> {
  const textPreview: string | null =
    record.post_type === "TEXT" && record.text_content
      ? record.text_content.length > 200
        ? record.text_content.substring(0, 200) + "..."
        : record.text_content
      : null;
  let linkDomain: string | null = null;
  if (record.post_type === "LINK" && record.link_url) {
    try {
      const url = new URL(record.link_url);
      linkDomain = url.hostname;
    } catch {
      linkDomain = null;
    }
  }
  return {
    id: record.id,
    title: record.title,
    post_type: record.post_type,
    author: {
      id: record.author.id,
      username: record.author.username,
      displayName: record.author.display_name ?? null,
      avatarUrl: record.author.avatar_url ?? null,
      karma: record.author.karma,
      createdAt: toISOStringSafe(record.author.created_at),
    } satisfies ICommunityMember.ISummary,
    community: {
      id: record.community.id,
      name: record.community.name,
      description: record.community.description.substring(0, 100),
      icon_url: record.community.icon_url ?? null,
      subscriber_count: record.community.subscriber_count,
      created_at: toISOStringSafe(record.community.created_at),
    } satisfies ICommunityCommunity.ISummary,
    vote_score: record.vote_score,
    comment_count: record.comment_count,
    text_preview: textPreview,
    link_domain: linkDomain,
    image_thumbnail_url: record.image_thumbnail_url ?? null,
    edited_at: record.edited_at ? toISOStringSafe(record.edited_at) : null,
    created_at: toISOStringSafe(record.created_at),
  } satisfies ICommunityPost.ISummary;
}
