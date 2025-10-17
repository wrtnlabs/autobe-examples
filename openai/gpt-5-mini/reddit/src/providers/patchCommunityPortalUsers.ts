import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";
import { IPageICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPortalUsers(props: {
  body: ICommunityPortalUser.IRequest;
}): Promise<IPageICommunityPortalUser.ISummary> {
  const { body } = props;

  try {
    const page = Number(body.page ?? 1);
    const limit = Number(body.limit ?? 20);
    const skip = (page - 1) * limit;

    // includeArchived requires authentication/authorization which is not provided in this endpoint props
    if (body.includeArchived === true) {
      throw new HttpException(
        "Unauthorized: includeArchived requires authentication",
        403,
      );
    }

    // Validate sort field and order
    const allowedSortFields = ["username", "created_at", "karma"];
    const sortBy = (body.sort_by ?? "created_at") as string;
    if (sortBy && !allowedSortFields.includes(sortBy)) {
      throw new HttpException("Bad Request: invalid sort_by field", 400);
    }

    const order = body.order === "asc" ? "asc" : "desc";

    // Build created_at filter if provided
    const createdAtFilter: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    } = {};
    if (body.created_from !== undefined && body.created_from !== null) {
      createdAtFilter.gte = toISOStringSafe(body.created_from);
    }
    if (body.created_to !== undefined && body.created_to !== null) {
      createdAtFilter.lte = toISOStringSafe(body.created_to);
    }

    // Build where clause inline (respecting null vs undefined)
    const where: Record<string, unknown> = {
      // Exclude soft-deleted by default
      deleted_at: null,
      ...(body.q !== undefined &&
        body.q !== null &&
        body.q !== "" && {
          OR: [
            { username: { contains: body.q } },
            { display_name: { contains: body.q } },
            { bio: { contains: body.q } },
          ],
        }),
      ...(body.username !== undefined &&
        body.username !== null && { username: { contains: body.username } }),
      ...(body.display_name !== undefined &&
        body.display_name !== null && {
          display_name: { contains: body.display_name },
        }),
      ...(body.min_karma !== undefined &&
        body.min_karma !== null && { karma: { gte: Number(body.min_karma) } }),
      ...(body.max_karma !== undefined &&
        body.max_karma !== null && { karma: { lte: Number(body.max_karma) } }),
      ...(Object.keys(createdAtFilter).length > 0 && {
        created_at: createdAtFilter,
      }),
    };

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.community_portal_users.findMany({
        where: where as any,
        select: {
          id: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_uri: true,
          karma: true,
          created_at: true,
          updated_at: true,
        },
        orderBy:
          sortBy === "created_at"
            ? { created_at: order }
            : sortBy === "karma"
              ? { karma: order }
              : { username: order },
        skip,
        take: limit,
      }),
      MyGlobal.prisma.community_portal_users.count({ where: where as any }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      username: r.username,
      display_name: r.display_name ?? undefined,
      bio: r.bio ?? undefined,
      avatar_uri: r.avatar_uri ?? undefined,
      karma: r.karma,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    }));

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: Number(total),
        pages: Math.ceil(Number(total) / Number(limit)),
      },
      data,
    };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new HttpException("Internal Server Error", 500);
  }
}
