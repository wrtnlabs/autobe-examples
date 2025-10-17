import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import { IEPostSortMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPostSortMode";
import { IPageICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPortalPosts(props: {
  body: ICommunityPortalPost.IRequest;
}): Promise<IPageICommunityPortalPost.ISummary> {
  const { body } = props;

  try {
    // Only privileged tooling may request deleted records
    if (body.includeDeleted) {
      throw new HttpException(
        "Forbidden: includeDeleted requires elevated privileges",
        403,
      );
    }

    const rawLimit = Number(body.limit ?? 20);
    const rawOffset = Number(body.offset ?? 0);

    if (rawLimit <= 0)
      throw new HttpException("Bad Request: limit must be > 0", 400);
    if (rawOffset < 0)
      throw new HttpException("Bad Request: offset must be >= 0", 400);

    const limit = Math.max(1, Math.min(rawLimit, 100));
    const offset = Math.max(0, rawOffset);

    const where: any = {
      deleted_at: null,
      ...(body.postType !== undefined &&
        body.postType !== null && { post_type: body.postType }),
      ...(body.status !== undefined &&
        body.status !== null && { status: body.status }),
      ...(body.communityId !== undefined &&
        body.communityId !== null && { community_id: body.communityId }),
      ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
      (body.createdTo !== undefined && body.createdTo !== null)
        ? {
            created_at: {
              ...(body.createdFrom !== undefined &&
                body.createdFrom !== null && {
                  gte: toISOStringSafe(body.createdFrom),
                }),
              ...(body.createdTo !== undefined &&
                body.createdTo !== null && {
                  lte: toISOStringSafe(body.createdTo),
                }),
            },
          }
        : {}),
      ...(body.q !== undefined &&
        body.q !== null && {
          OR: [{ title: { contains: body.q } }, { body: { contains: body.q } }],
        }),
      // Public visibility filter for unauthenticated callers
      community: {
        visibility: "public",
        is_private: false,
      },
    };

    const desc = "desc" as Prisma.SortOrder;
    const orderBy =
      body.sort === "top"
        ? [{ created_at: desc }, { id: desc }]
        : body.sort === "hot"
          ? [{ created_at: desc }, { id: desc }]
          : body.sort === "controversial"
            ? [{ created_at: desc }, { id: desc }]
            : [{ created_at: desc }, { id: desc }];

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.community_portal_posts.findMany({
        where,
        select: {
          id: true,
          title: true,
          post_type: true,
          community_id: true,
          author_user_id: true,
          created_at: true,
          status: true,
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      MyGlobal.prisma.community_portal_posts.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      title: r.title,
      post_type: r.post_type,
      community_id: r.community_id,
      // optional+nullable field: prefer undefined when absent to match optional semantics
      author_user_id:
        r.author_user_id === null
          ? undefined
          : (r.author_user_id as string & tags.Format<"uuid">),
      created_at: toISOStringSafe(r.created_at),
      status: r.status,
    }));

    return {
      pagination: {
        current: Number(offset),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / (limit || 1)),
      },
      data,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
