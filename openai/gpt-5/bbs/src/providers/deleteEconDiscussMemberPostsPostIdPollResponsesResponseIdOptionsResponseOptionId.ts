import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconDiscussMemberPostsPostIdPollResponsesResponseIdOptionsResponseOptionId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
  responseOptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId, responseId, responseOptionId } = props;

  // 1) Find poll attached to the post (ensure active)
  const poll = await MyGlobal.prisma.econ_discuss_polls.findFirst({
    where: {
      econ_discuss_post_id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      allow_vote_change: true,
      start_at: true,
      end_at: true,
    },
  });
  if (!poll) throw new HttpException("Not Found", 404);

  // 2) Load response and verify it belongs to this poll
  const response = await MyGlobal.prisma.econ_discuss_poll_responses.findUnique(
    {
      where: { id: responseId },
      select: {
        id: true,
        econ_discuss_poll_id: true,
        econ_discuss_user_id: true,
        status: true,
      },
    },
  );
  if (!response || response.econ_discuss_poll_id !== poll.id)
    throw new HttpException("Not Found", 404);

  // 3) Load response-option and verify linkage to the response
  const responseOption =
    await MyGlobal.prisma.econ_discuss_poll_response_options.findUnique({
      where: { id: responseOptionId },
      select: {
        id: true,
        econ_discuss_poll_response_id: true,
        deleted_at: true,
      },
    });
  if (
    !responseOption ||
    responseOption.econ_discuss_poll_response_id !== response.id
  )
    throw new HttpException("Not Found", 404);

  // 4) Authorization: owner or staff (moderator/admin)
  const isOwner: boolean = response.econ_discuss_user_id === member.id;
  let isStaff: boolean = false;
  if (!isOwner) {
    const [admin, moderator] = await Promise.all([
      MyGlobal.prisma.econ_discuss_admins.findFirst({
        where: { user_id: member.id, deleted_at: null },
        select: { id: true },
      }),
      MyGlobal.prisma.econ_discuss_moderators.findFirst({
        where: { user_id: member.id, deleted_at: null },
        select: { id: true },
      }),
    ]);
    isStaff = !!admin || !!moderator;
  }
  if (!isOwner && !isStaff) throw new HttpException("Forbidden", 403);

  // 5) Idempotency: already removed
  if (responseOption.deleted_at) return;

  // 6) Policy checks for non-staff users
  if (!isStaff) {
    // allow_vote_change must be true
    if (!poll.allow_vote_change) {
      throw new HttpException("Conflict", 409);
    }
    // Poll window must be open: start_at <= now < end_at
    const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
    if (poll.start_at) {
      const startIso: string & tags.Format<"date-time"> = toISOStringSafe(
        poll.start_at,
      );
      if (startIso > now) throw new HttpException("Conflict", 409);
    }
    if (poll.end_at) {
      const endIso: string & tags.Format<"date-time"> = toISOStringSafe(
        poll.end_at,
      );
      if (endIso <= now) throw new HttpException("Conflict", 409);
    }
    // Response status integrity
    const statusLower = response.status.toLowerCase();
    if (statusLower === "invalidated" || statusLower === "quarantined") {
      throw new HttpException("Conflict", 409);
    }
  }

  // 7) Soft delete the response-option
  const nowDelete: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.econ_discuss_poll_response_options.update({
    where: { id: responseOption.id },
    data: {
      deleted_at: nowDelete,
      updated_at: nowDelete,
    },
  });

  return;
}
