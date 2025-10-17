import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPollResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponse";
import { IEEconDiscussPollResponseStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPollResponseStatus";
import { IEconDiscussPollResponseOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponseOption";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconDiscussMemberPostsPostIdPollResponsesResponseId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussPollResponse> {
  const { member, postId, responseId } = props;

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
    include: {
      econ_discuss_poll_response_options: {
        where: { deleted_at: null },
        select: {
          id: true,
          econ_discuss_poll_option_id: true,
          position: true,
        },
      },
    },
  });
  if (!response) throw new HttpException("Not Found", 404);

  if (response.econ_discuss_user_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const selections = response.econ_discuss_poll_response_options.map((sel) => ({
    id: sel.id as string & tags.Format<"uuid">,
    optionId: sel.econ_discuss_poll_option_id as string & tags.Format<"uuid">,
    position:
      sel.position === null
        ? null
        : (sel.position as number & tags.Type<"int32">),
  }));

  return {
    id: response.id as string & tags.Format<"uuid">,
    pollId: response.econ_discuss_poll_id as string & tags.Format<"uuid">,
    userId: response.econ_discuss_user_id as string & tags.Format<"uuid">,
    status: response.status as IEEconDiscussPollResponseStatus,
    likertValue:
      response.likert_value === null
        ? null
        : (response.likert_value as number & tags.Type<"int32">),
    numericValue: response.numeric_value ?? null,
    withdrawnAt: response.withdrawn_at
      ? toISOStringSafe(response.withdrawn_at)
      : null,
    createdAt: toISOStringSafe(response.created_at),
    updatedAt: toISOStringSafe(response.updated_at),
    selections,
  };
}
