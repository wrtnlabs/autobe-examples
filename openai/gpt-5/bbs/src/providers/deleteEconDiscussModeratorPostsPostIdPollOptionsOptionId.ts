import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconDiscussModeratorPostsPostIdPollOptionsOptionId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, postId, optionId } = props;

  const moderatorRecord =
    await MyGlobal.prisma.econ_discuss_moderators.findFirst({
      where: {
        user_id: moderator.id,
        deleted_at: null,
        user: {
          is: {
            deleted_at: null,
            email_verified: true,
          },
        },
      },
    });
  if (moderatorRecord === null) throw new HttpException("Forbidden", 403);

  const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true },
  });
  if (post === null) throw new HttpException("Not Found", 404);

  const poll = await MyGlobal.prisma.econ_discuss_polls.findFirst({
    where: { econ_discuss_post_id: post.id, deleted_at: null },
    select: { id: true },
  });
  if (poll === null) throw new HttpException("Not Found", 404);

  const option = await MyGlobal.prisma.econ_discuss_poll_options.findFirst({
    where: {
      id: optionId,
      econ_discuss_poll_id: poll.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (option === null) throw new HttpException("Not Found", 404);

  const linkedResponseSelection =
    await MyGlobal.prisma.econ_discuss_poll_response_options.findFirst({
      where: {
        econ_discuss_poll_option_id: option.id,
        deleted_at: null,
        response: { is: { deleted_at: null } },
      },
      select: { id: true },
    });
  if (linkedResponseSelection !== null) {
    throw new HttpException("Conflict: Option has existing responses", 409);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_poll_options.update({
    where: { id: option.id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
