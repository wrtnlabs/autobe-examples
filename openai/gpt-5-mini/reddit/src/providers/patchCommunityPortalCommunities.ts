import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import { IPageICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPortalCommunities(props: {
  body: ICommunityPortalCommunity.IRequest;
}): Promise<IPageICommunityPortalCommunity.ISummary> {
  const { body } = props;

  // Pagination defaults and coercion
  const requestedPage = Number(body.page ?? 1);
  const requestedLimit = Number(body.limit ?? 20);
  const rawOffset =
    body.offset !== undefined && body.offset !== null
      ? Number(body.offset)
      : null;

  if (!Number.isFinite(requestedPage) || requestedPage < 1) {
    throw new HttpException(
      "Bad Request: 'page' must be a positive integer.",
      400,
    );
  }
  if (!Number.isFinite(requestedLimit) || requestedLimit < 1) {
    throw new HttpException(
      "Bad Request: 'limit' must be a positive integer.",
      400,
    );
  }

  const maxLimit = 100;
  const limit = Math.min(requestedLimit, maxLimit);
  const offset = rawOffset !== null ? rawOffset : (requestedPage - 1) * limit;

  // Validate sort_by
  const allowedSortFields = ["created_at", "name", "slug"];
  const sortBy = body.sort_by ?? "created_at";
  if (
    sortBy !== null &&
    sortBy !== undefined &&
    !allowedSortFields.includes(sortBy)
  ) {
    throw new HttpException(
      `Bad Request: unsupported sort_by value '${String(sortBy)}'`,
      400,
    );
  }

  // Unauthorized if requesting private data without authentication (no auth in props)
  if (
    (body.visibility !== undefined &&
      body.visibility !== null &&
      body.visibility === "private") ||
    (body.is_private !== undefined &&
      body.is_private !== null &&
      body.is_private === true)
  ) {
    throw new HttpException(
      "Unauthorized: private communities require authentication",
      401,
    );
  }

  // Canonicalize slug if provided
  const canonicalizeSlug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Build where condition (base: only active, public communities)
  const where: Record<string, unknown> = {
    deleted_at: null,
    is_private: false,
    visibility: "public",
    ...(body.slug !== undefined &&
      body.slug !== null && { slug: canonicalizeSlug(String(body.slug)) }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
    ...(body.q !== undefined &&
      body.q !== null && {
        OR: [
          { name: { contains: body.q } },
          { description: { contains: body.q } },
        ],
      }),
  };

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.community_portal_communities.findMany({
        where,
        orderBy:
          sortBy === "created_at"
            ? { created_at: "desc" }
            : sortBy === "name"
              ? { name: "asc" }
              : { slug: "asc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          is_private: true,
          visibility: true,
          created_at: true,
          updated_at: true,
        },
      }),
      MyGlobal.prisma.community_portal_communities.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description === null ? undefined : r.description,
      is_private: r.is_private === null ? undefined : r.is_private,
      visibility: r.visibility === null ? undefined : r.visibility,
      created_at: r.created_at ? toISOStringSafe(r.created_at) : undefined,
      updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : undefined,
    }));

    const current =
      rawOffset !== null ? Math.floor(offset / limit) + 1 : requestedPage;
    const pages = Math.ceil(total / limit) || 0;

    return {
      pagination: {
        current: Number(current),
        limit: Number(limit),
        records: Number(total),
        pages: Number(pages),
      },
      data,
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
