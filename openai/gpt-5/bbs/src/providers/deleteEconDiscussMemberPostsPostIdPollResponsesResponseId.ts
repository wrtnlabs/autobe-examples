import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconDiscussMemberPostsPostIdPollResponsesResponseId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId, responseId } = props;

  const response = await MyGlobal.prisma.econ_discuss_poll_responses.findUnique(
    {
      where: { id: responseId },
      include: { poll: true },
    },
  );
  if (!response) throw new HttpException("Not Found", 404);

  if (!response.poll || response.poll.econ_discuss_post_id !== postId) {
    throw new HttpException("Not Found", 404);
  }

  if (response.econ_discuss_user_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const pollClosed = response.poll.end_at
    ? response.poll.end_at.getTime() <= Date.now()
    : false;
  if (pollClosed || !response.poll.allow_vote_change) {
    throw new HttpException("Forbidden", 403);
  }

  if (response.status === "withdrawn" || response.deleted_at !== null) {
    return;
  }

  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_poll_responses.update({
    where: { id: responseId },
    data: {
      status: "withdrawn",
      withdrawn_at: now,
      deleted_at: now,
      updated_at: now,
    },
  });
}
