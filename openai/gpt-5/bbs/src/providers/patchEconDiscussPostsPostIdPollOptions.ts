import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import { IEconDiscussPollOptionSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOptionSortBy";
import { IEOrderDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEOrderDirection";
import { IPageIEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPollOption";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconDiscussPostsPostIdPollOptions(props: {
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPollOption.IRequest;
}): Promise<IPageIEconDiscussPollOption.ISummary> {
  const { postId, body } = props;

  // Verify the post exists
  const post = await MyGlobal.prisma.econ_discuss_posts.findUnique({
    where: { id: postId },
    select: { id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Locate the poll uniquely associated with the post
  const poll = await MyGlobal.prisma.econ_discuss_polls.findUnique({
    where: { econ_discuss_post_id: postId },
    select: { id: true },
  });

  // Pagination defaults
  const page = body.page ?? 1;
  const pageSize = body.pageSize ?? 20;
  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  // When no poll is configured, return an empty page
  if (!poll) {
    return {
      pagination: {
        current: Number(page),
        limit: Number(pageSize),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Sorting configuration
  const sortBy = body.sort_by ?? "position";
  const order: "asc" | "desc" = body.order === "desc" ? "desc" : "asc";

  // Fetch rows and total in parallel (identical where for both)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_poll_options.findMany({
      where: {
        econ_discuss_poll_id: poll.id,
        deleted_at: null,
        ...(body.q && { option_text: { contains: body.q } }),
      },
      orderBy:
        sortBy === "position"
          ? { position: order }
          : sortBy === "created_at"
            ? { created_at: order }
            : { option_text: order },
      skip,
      take,
      select: {
        id: true,
        econ_discuss_poll_id: true,
        option_text: true,
        position: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.econ_discuss_poll_options.count({
      where: {
        econ_discuss_poll_id: poll.id,
        deleted_at: null,
        ...(body.q && { option_text: { contains: body.q } }),
      },
    }),
  ]);

  const pages = total === 0 ? 0 : Math.ceil(total / Number(pageSize));

  // Map DB rows to API summaries
  const data: IEconDiscussPollOption.ISummary[] = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    pollId: r.econ_discuss_poll_id as string & tags.Format<"uuid">,
    text: r.option_text,
    position: r.position as number & tags.Type<"int32">,
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
