import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { IPageICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

export async function patchCommunityBbsCommunitiesCommunitySlugPosts(props: {
  communitySlug: string;
  body: ICommunityBbsPost.IRequest;
}): Promise<IPageICommunityBbsPost.ISummary> {
  const { communitySlug, body } = props;

  // Resolve community by slug with creator and settings
  const community = await MyGlobal.prisma.community_bbs_communities.findUnique({
    where: { slug: communitySlug },
    include: { creator: true, community_bbs_community_settings: true },
  });
  if (!community) throw new HttpException("Not Found", 404);

  // Authorization: no auth provided in props => public-only
  if (community.visibility !== "public") {
    throw new HttpException("Forbidden", 403);
  }

  // If community settings require post approval, unauthenticated callers cannot see pending posts
  const requiresApproval = !!(
    community.community_bbs_community_settings &&
    community.community_bbs_community_settings.require_post_approval === true
  );

  // Build where condition
  const where: any = {
    community_bbs_community_id: community.id,
    deleted_at: null,
    // For public callers, only published posts
    is_published: true,
    business_status: "published",
  };

  if (body.post_type !== undefined && body.post_type !== null) {
    where.post_type = body.post_type;
  }

  // Date range on published_at
  if (body.start_date !== undefined && body.start_date !== null) {
    where.published_at = {
      ...(where.published_at ?? {}),
      gte: body.start_date,
    };
  }
  if (body.end_date !== undefined && body.end_date !== null) {
    where.published_at = { ...(where.published_at ?? {}), lte: body.end_date };
  }

  // Full text-ish search using contains (GIN indexes on title & body help)
  if (body.q) {
    where.OR = [
      { title: { contains: body.q } },
      { body: { contains: body.q } },
    ];
  }

  // Pagination
  const limitRaw = body.limit ?? 25;
  const limit = Number(limitRaw > 100 ? 100 : limitRaw);

  // Cursor handling: cursor is last id of previous page
  if (body.cursor) {
    const pivot = await MyGlobal.prisma.community_bbs_posts.findUnique({
      where: { id: body.cursor },
      select: { created_at: true, id: true },
    });
    if (pivot) {
      // posts ordered by created_at desc; fetch items with created_at < pivot.created_at
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { created_at: { lt: pivot.created_at } },
            {
              AND: [
                { created_at: { equals: pivot.created_at } },
                { id: { lt: pivot.id } },
              ],
            },
          ],
        },
      ];
    }
  }

  // Sorting
  const sort = body.sort ?? "new";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_posts.findMany({
      where,
      include: { author: true },
      orderBy:
        sort === "new"
          ? { published_at: "desc" }
          : sort === "top"
            ? { score: "desc" }
            : sort === "controversial"
              ? { upvotes: "desc" }
              : { score: "desc" },
      take: limit,
    }),
    MyGlobal.prisma.community_bbs_posts.count({ where }),
  ]);

  // Map community summary
  const communitySummary = {
    id: community.id,
    name: community.name,
    slug: community.slug,
    description: community.description ?? undefined,
    creator: {
      id: community.creator.id,
      username: community.creator.username,
      display_name: community.creator.display_name ?? undefined,
      karma: community.creator.karma,
      created_at: toISOStringSafe(community.creator.created_at),
      updated_at: toISOStringSafe(community.creator.updated_at),
    },
    visibility: community.visibility as "public" | "restricted" | "private",
    post_approval_required: community.post_approval_required,
    members_count: community.members_count,
    posts_count: community.posts_count,
    community_settings: undefined,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at: community.deleted_at
      ? toISOStringSafe(community.deleted_at)
      : undefined,
  };

  const data = rows.map((r) => {
    const author = r.author;
    return {
      id: r.id,
      title: r.title,
      post_type: r.post_type,
      score: r.score,
      upvotes: r.upvotes,
      downvotes: r.downvotes,
      comment_count: r.comment_count,
      published_at: r.published_at
        ? toISOStringSafe(r.published_at)
        : undefined,
      is_published: r.is_published,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      author: {
        id: author.id,
        username: author.username,
        display_name: author.display_name ?? undefined,
        karma: author.karma,
        created_at: toISOStringSafe(author.created_at),
        updated_at: toISOStringSafe(author.updated_at),
      },
      community: communitySummary,
    };
  });

  const pagination = {
    current: Number(1),
    limit: Number(limit),
    records: Number(total),
    pages: Number(Math.ceil(total / limit)),
  };

  return { pagination, data };
}
