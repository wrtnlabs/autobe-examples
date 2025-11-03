import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardTags(props: {
  body: IDiscussionBoardTag.IRequest;
}): Promise<IPageIDiscussionBoardTag.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> as number;
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_tags.findMany({
      where: {
        ...(body.search !== undefined && {
          name: { contains: body.search },
        }),
        ...((body.created_after !== undefined ||
          body.created_before !== undefined) && {
          created_at: {
            ...(body.created_after !== undefined && {
              gte: body.created_after,
            }),
            ...(body.created_before !== undefined && {
              lte: body.created_before,
            }),
          },
        }),
      },
      orderBy:
        body.sort === "name_desc"
          ? { name: "desc" as const }
          : body.sort === "created_at_asc"
            ? { created_at: "asc" as const }
            : body.sort === "created_at_desc"
              ? { created_at: "desc" as const }
              : body.sort === "usage_desc"
                ? { created_at: "desc" as const }
                : { name: "asc" as const },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_tags.count({
      where: {
        ...(body.search !== undefined && {
          name: { contains: body.search },
        }),
        ...((body.created_after !== undefined ||
          body.created_before !== undefined) && {
          created_at: {
            ...(body.created_after !== undefined && {
              gte: body.created_after,
            }),
            ...(body.created_before !== undefined && {
              lte: body.created_before,
            }),
          },
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((tag) => ({
      id: tag.id as string & tags.Format<"uuid">,
      name: tag.name,
      slug: tag.slug,
      created_at: toISOStringSafe(tag.created_at),
      updated_at: toISOStringSafe(tag.updated_at),
    })),
  };
}
