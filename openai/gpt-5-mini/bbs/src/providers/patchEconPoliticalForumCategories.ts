import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import { IPageIEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconPoliticalForumCategories(props: {
  body: IEconPoliticalForumCategory.IRequest;
}): Promise<IPageIEconPoliticalForumCategory.ISummary> {
  const { body } = props;

  // Pagination defaults and normalization
  const page = Number(body.page ?? 1);
  const limitInput = Number(body.limit ?? 20);
  const limit = Math.min(Math.max(limitInput, 1), 100);

  if (!Number.isFinite(page) || page < 1) {
    throw new HttpException("Bad Request: invalid page parameter", 400);
  }
  if (!Number.isFinite(limit) || limit < 1) {
    throw new HttpException("Bad Request: invalid limit parameter", 400);
  }

  const skip = (page - 1) * limit;

  try {
    const where = {
      // includeDeleted handled by controller; default to active rows only
      ...(body.includeDeleted ? {} : { deleted_at: null }),
      ...(body.is_moderated !== undefined &&
        body.is_moderated !== null && {
          is_moderated: body.is_moderated,
        }),
      ...(body.requires_verification !== undefined &&
        body.requires_verification !== null && {
          requires_verification: body.requires_verification,
        }),
      ...(body.q !== undefined &&
        body.q !== null && {
          OR: [
            { name: { contains: body.q } },
            { slug: { contains: body.q } },
            { description: { contains: body.q } },
          ],
        }),
    };

    const orderDir = (
      body.order === "asc" ? "asc" : "desc"
    ) as Prisma.SortOrder;

    let orderBy:
      | Prisma.econ_political_forum_categoriesOrderByWithRelationInput
      | undefined;
    if (body.sort_by === "order") {
      orderBy = { order: orderDir };
    } else if (body.sort_by === "created_at") {
      orderBy = { created_at: orderDir };
    } else {
      orderBy = { name: orderDir };
    }

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_categories.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          code: true,
          name: true,
          slug: true,
          description: true,
          is_moderated: true,
          requires_verification: true,
          order: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      }),
      MyGlobal.prisma.econ_political_forum_categories.count({ where }),
    ]);

    const data = rows.map((r) => {
      return {
        id: r.id,
        code: r.code ?? null,
        name: r.name,
        slug: r.slug,
        description: r.description ?? null,
        is_moderated: r.is_moderated,
        requires_verification: r.requires_verification,
        order: r.order,
        created_at: toISOStringSafe(r.created_at),
        updated_at: toISOStringSafe(r.updated_at),
        // deleted_at is optional in the summary, include null if present
        ...(r.deleted_at !== null && r.deleted_at !== undefined
          ? { deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null }
          : {}),
      };
    });

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
