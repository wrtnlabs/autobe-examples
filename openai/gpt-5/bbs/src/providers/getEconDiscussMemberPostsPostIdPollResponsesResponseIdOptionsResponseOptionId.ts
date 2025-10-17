import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPollResponseOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponseOption";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconDiscussMemberPostsPostIdPollResponsesResponseIdOptionsResponseOptionId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
  responseOptionId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussPollResponseOption> {
  const { member, postId, responseId, responseOptionId } = props;

  const poll = await MyGlobal.prisma.econ_discuss_polls.findFirst({
    where: {
      econ_discuss_post_id: postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!poll) throw new HttpException("Not Found", 404);

  const response = await MyGlobal.prisma.econ_discuss_poll_responses.findFirst({
    where: {
      id: responseId,
      econ_discuss_poll_id: poll.id,
      deleted_at: null,
    },
    select: {
      id: true,
      econ_discuss_user_id: true,
      status: true,
    },
  });
  if (!response) throw new HttpException("Not Found", 404);

  if (response.econ_discuss_user_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const selection =
    await MyGlobal.prisma.econ_discuss_poll_response_options.findFirst({
      where: {
        id: responseOptionId,
        econ_discuss_poll_response_id: response.id,
        deleted_at: null,
      },
      select: {
        id: true,
        econ_discuss_poll_response_id: true,
        econ_discuss_poll_option_id: true,
        position: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!selection) throw new HttpException("Not Found", 404);

  return {
    id: responseOptionId,
    responseId: responseId,
    optionId: selection.econ_discuss_poll_option_id as string &
      tags.Format<"uuid">,
    position: selection.position === null ? null : selection.position,
    createdAt: toISOStringSafe(selection.created_at),
    updatedAt: toISOStringSafe(selection.updated_at),
  };
}
