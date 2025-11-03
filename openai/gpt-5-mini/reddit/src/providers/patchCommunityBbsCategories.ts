import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityCategory";
import { IPageICommunityBbsCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunityCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function patchCommunityBbsCategories(props: {
  body: ICommunityBbsCommunityCategory.IRequest;
}): Promise<IPageICommunityBbsCommunityCategory.ISummary> {
  const { body } = props;

  const page = Number(body.page ?? 0);
  const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 100);
  const skip = page * limit;

  const buildWhere = () => {
    const condition: Record<string, unknown> = {
      deleted_at: null,
    };

    if (body.code !== undefined && body.code !== null) {
      condition.code = body.code;
    }

    if (body.parent_code !== undefined && body.parent_code !== null) {
      condition.parent = { code: body.parent_code };
    }

    if (body.q !== undefined && body.q !== null && body.q !== "") {
      condition.OR = [
        { title: { contains: body.q } },
        { description: { contains: body.q } },
      ];
    }

    return condition;
  };

  try {
    const where = buildWhere();

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.community_bbs_community_categories.findMany({
        where,
        include: {
          parent: {
            select: {
              id: true,
              code: true,
              title: true,
              description: true,
              display_order: true,
              created_at: true,
              updated_at: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              display_name: true,
              is_super_admin: true,
              created_at: true,
            },
          },
        },
        orderBy:
          body.sort === "display_order.asc"
            ? { display_order: "asc" }
            : body.sort === "display_order.desc"
              ? { display_order: "desc" }
              : body.sort === "created_at.asc"
                ? { created_at: "asc" }
                : body.sort === "created_at.desc"
                  ? { created_at: "desc" }
                  : body.sort === "title.asc"
                    ? { title: "asc" }
                    : body.sort === "title.desc"
                      ? { title: "desc" }
                      : [{ display_order: "asc" }, { title: "asc" }],
        skip,
        take: limit,
      }),

      MyGlobal.prisma.community_bbs_community_categories.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      description: r.description === null ? null : r.description,
      display_order: r.display_order ?? undefined,
      parent: r.parent
        ? {
            id: r.parent.id,
            code: r.parent.code,
            title: r.parent.title,
            description:
              r.parent.description === null ? null : r.parent.description,
            display_order: r.parent.display_order ?? undefined,
            parent: null,
            created_by: null,
            created_at: toISOStringSafe(r.parent.created_at),
            updated_at: toISOStringSafe(r.parent.updated_at),
          }
        : null,
      created_by: r.createdBy
        ? {
            id: r.createdBy.id,
            display_name:
              r.createdBy.display_name === null
                ? null
                : r.createdBy.display_name,
            is_super_admin: r.createdBy.is_super_admin ?? undefined,
            created_at: r.createdBy.created_at
              ? toISOStringSafe(r.createdBy.created_at)
              : null,
          }
        : null,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    }));

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    } satisfies IPageICommunityBbsCommunityCategory.ISummary;
  } catch (error) {
    throw new HttpException("Internal Server Error", 500);
  }
}
