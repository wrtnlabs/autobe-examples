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
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_tags.findMany({
      where: {
        ...(body.search !== undefined &&
          body.search !== null && {
            name: {
              contains: body.search,
            },
          }),
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...((body.created_after !== undefined && body.created_after !== null) ||
        (body.created_before !== undefined && body.created_before !== null)
          ? {
              created_at: {
                ...(body.created_after !== undefined &&
                  body.created_after !== null && {
                    gte: body.created_after,
                  }),
                ...(body.created_before !== undefined &&
                  body.created_before !== null && {
                    lte: body.created_before,
                  }),
              },
            }
          : {}),
      },
      orderBy:
        body.sort_by === "created_at"
          ? { created_at: body.order === "asc" ? "asc" : "desc" }
          : { name: body.order === "asc" ? "asc" : "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_tags.count({
      where: {
        ...(body.search !== undefined &&
          body.search !== null && {
            name: {
              contains: body.search,
            },
          }),
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...((body.created_after !== undefined && body.created_after !== null) ||
        (body.created_before !== undefined && body.created_before !== null)
          ? {
              created_at: {
                ...(body.created_after !== undefined &&
                  body.created_after !== null && {
                    gte: body.created_after,
                  }),
                ...(body.created_before !== undefined &&
                  body.created_before !== null && {
                    lte: body.created_before,
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  const data: IDiscussionBoardTag.ISummary[] = results.map((tag) => ({
    id: tag.id as string & tags.Format<"uuid">,
    name: tag.name,
    description: tag.description ?? undefined,
    status: tag.status,
    created_at: toISOStringSafe(tag.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
