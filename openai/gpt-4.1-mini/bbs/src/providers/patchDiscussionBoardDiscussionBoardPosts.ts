import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import { IPageIDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardDiscussionBoardPosts(props: {
  body: IDiscussionBoardDiscussionBoardPost.IRequest;
}): Promise<IPageIDiscussionBoardDiscussionBoardPost.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const where = {
    deleted_at: null,
    ...(body.category_id !== undefined &&
      body.category_id !== null && { category_id: body.category_id }),
    ...(body.member_id !== undefined &&
      body.member_id !== null && { member_id: body.member_id }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { title: { contains: body.search } },
          { body: { contains: body.search } },
        ],
      }),
  };

  const orderBy =
    body.order_by === "created_at ASC"
      ? ({ created_at: "asc" } as const)
      : body.order_by === "created_at DESC"
        ? ({ created_at: "desc" } as const)
        : body.order_by === "updated_at ASC"
          ? ({ updated_at: "asc" } as const)
          : ({ updated_at: "desc" } as const);

  const [results, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_posts.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        category_id: true,
        member_id: true,
        title: true,
        post_status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_posts.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      category_id: item.category_id,
      member_id: item.member_id,
      title: item.title,
      post_status: item.post_status,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
