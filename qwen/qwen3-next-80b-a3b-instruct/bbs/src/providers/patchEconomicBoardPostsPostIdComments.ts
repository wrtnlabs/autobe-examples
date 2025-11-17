import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IPageIEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconomicBoardPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IEconomicBoardComment.IRequest;
}): Promise<IPageIEconomicBoardComment.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.economic_board_comments.findMany({
      where: {
        post_id: props.postId,
        status: "published",
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.economic_board_comments.count({
      where: {
        post_id: props.postId,
        status: "published",
        deleted_at: null,
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: comments.map((comment) => comment.body),
  };
}
