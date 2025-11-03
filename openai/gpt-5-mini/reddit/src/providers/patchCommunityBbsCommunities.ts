import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { IPageICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

export async function patchCommunityBbsCommunities(props: {
  body: ICommunityBbsCommunity.IRequest;
}): Promise<IPageICommunityBbsCommunity.ISummary> {
  const { body } = props;

  // Validate sort and required parameters
  const allowedSorts = ["new", "top", "hot", "controversial"];
  const sort = body.sort ?? "new";
  if (!allowedSorts.includes(sort))
    throw new HttpException("Invalid sort value", 400);
  if (sort === "top" && !body.time_window)
    throw new HttpException("time_window is required when sort='top'", 400);

  // Pagination defaults and validation
  const limit = Number(body.limit ?? 25);
  if (!Number.isFinite(limit) || limit < 1 || limit > 100)
    throw new HttpException("limit must be a number between 1 and 100", 400);
  const page = Number(body.page ?? 1);
  if (!Number.isFinite(page) || page < 1)
    throw new HttpException("page must be a positive integer", 400);
  const skip = (page - 1) * limit;

  // Build where clause inline (public discovery: only public communities)
  const where: Record<string, unknown> = {
    deleted_at: null,
    visibility: "public",
  };

  if (body.q) {
    // Use trigram-backed GIN indexes on name/description for fuzzy search
    Object.assign(where, {
      OR: [
        { name: { contains: body.q } },
        { description: { contains: body.q } },
        { slug: { contains: body.q } },
      ],
    });
  }

  if (body.visibility !== undefined && body.visibility !== null) {
    // Apply caller-provided visibility filter. Public callers without auth
    // will effectively receive only public results unless they request public.
    where.visibility = body.visibility;
  }

  if (
    body.post_approval_required !== undefined &&
    body.post_approval_required !== null
  ) {
    // Filter by per-community setting using relation 'is' (one-to-one)
    Object.assign(where, {
      community_bbs_community_settings: {
        is: { require_post_approval: body.post_approval_required },
      },
    });
  }

  // Inline orderBy mapping - ensure values are Prisma.SortOrder
  const orderBy =
    sort === "new"
      ? { created_at: "desc" as Prisma.SortOrder }
      : sort === "hot"
        ? { posts_count: "desc" as Prisma.SortOrder }
        : sort === "controversial"
          ? { members_count: "desc" as Prisma.SortOrder }
          : { posts_count: "desc" as Prisma.SortOrder }; // 'top' proxy

  const [rowsRaw, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_communities.findMany({
      where,
      include: { community_bbs_community_settings: true, creator: true },
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_bbs_communities.count({ where }),
  ]);

  // Cast the raw rows to a permissive shape so we can access included relations
  const rows = rowsRaw as Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    created_at: Date | string;
    updated_at: Date | string;
    deleted_at: Date | string | null;
    visibility: string;
    post_approval_required: boolean;
    members_count: number;
    posts_count: number;
    creator?: any;
    community_bbs_community_settings?: any;
  }>;

  const data = rows.map((r) => {
    // Ensure relation fields use null instead of undefined and convert all dates
    const creator = r.creator
      ? {
          id: r.creator.id,
          username: r.creator.username,
          display_name: r.creator.display_name ?? null,
          karma: r.creator.karma,
          created_at: toISOStringSafe(r.creator.created_at),
          updated_at: toISOStringSafe(r.creator.updated_at),
        }
      : null; // use null, not undefined

    const community_settings = r.community_bbs_community_settings
      ? {
          id: r.community_bbs_community_settings.id,
          community_id: r.community_bbs_community_settings.community_id,
          visibility: r.community_bbs_community_settings.visibility,
          require_post_approval:
            r.community_bbs_community_settings.require_post_approval === null
              ? null
              : r.community_bbs_community_settings.require_post_approval,
          max_images_per_post:
            r.community_bbs_community_settings.max_images_per_post === null
              ? null
              : r.community_bbs_community_settings.max_images_per_post,
          allowed_image_mime_types: r.community_bbs_community_settings
            .allowed_image_mime_types
            ? r.community_bbs_community_settings.allowed_image_mime_types
                .split(",")
                .map((s: string) => s.trim())
            : null,
          created_at: toISOStringSafe(
            r.community_bbs_community_settings.created_at,
          ),
          updated_at: toISOStringSafe(
            r.community_bbs_community_settings.updated_at,
          ),
          deleted_at: r.community_bbs_community_settings.deleted_at
            ? toISOStringSafe(r.community_bbs_community_settings.deleted_at)
            : null,
        }
      : null; // use null, not undefined

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description ?? null,
      creator,
      visibility: r.visibility as ICommunityBbsCommunity.ISummary["visibility"],
      post_approval_required: r.post_approval_required,
      members_count: r.members_count,
      posts_count: r.posts_count,
      community_settings,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    };
  });

  const pages = Math.max(1, Math.ceil(total / limit));

  // Perform a final structural cast at the boundary to satisfy the return type
  // without using typia.assert on Prisma types.
  const result: IPageICommunityBbsCommunity.ISummary = {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data: data as unknown as ICommunityBbsCommunity.ISummary[],
  };

  return result;
}
