import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";

export async function getEconDiscussPostsPostIdPollOptionsOptionId(props: {
  postId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussPollOption> {
  try {
    const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
      where: { id: props.postId, deleted_at: null },
      select: { id: true },
    });
    if (!post) throw new HttpException("Not Found", 404);

    const poll = await MyGlobal.prisma.econ_discuss_polls.findFirst({
      where: { econ_discuss_post_id: props.postId, deleted_at: null },
      select: { id: true },
    });
    if (!poll) throw new HttpException("Not Found", 404);

    const option = await MyGlobal.prisma.econ_discuss_poll_options.findFirst({
      where: {
        id: props.optionId,
        econ_discuss_poll_id: poll.id,
        deleted_at: null,
      },
      select: {
        id: true,
        econ_discuss_poll_id: true,
        option_text: true,
        position: true,
        created_at: true,
        updated_at: true,
      },
    });
    if (!option) throw new HttpException("Not Found", 404);

    return {
      id: option.id as string & tags.Format<"uuid">,
      pollId: option.econ_discuss_poll_id as string & tags.Format<"uuid">,
      text: option.option_text as string & tags.MinLength<1>,
      position: option.position as number & tags.Type<"int32">,
      createdAt: toISOStringSafe(option.created_at),
      updatedAt: toISOStringSafe(option.updated_at),
    };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new HttpException("Internal Server Error", 500);
  }
}
