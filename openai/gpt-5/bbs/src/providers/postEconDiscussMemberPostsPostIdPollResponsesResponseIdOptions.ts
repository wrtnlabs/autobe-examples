import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPollResponseOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponseOption";
import { IEconDiscussPollResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponse";
import { IEEconDiscussPollResponseStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPollResponseStatus";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconDiscussMemberPostsPostIdPollResponsesResponseIdOptions(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
  body: IEconDiscussPollResponseOption.ICreate;
}): Promise<IEconDiscussPollResponse> {
  const { member, postId, responseId, body } = props;

  // Load poll by postId (unique per post)
  const poll = await MyGlobal.prisma.econ_discuss_polls.findUnique({
    where: { econ_discuss_post_id: postId },
  });
  if (!poll) throw new HttpException("Poll not found for the given post", 404);

  // Current time
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const nowMs = Date.now();
  const startMs = poll.start_at
    ? Date.parse(toISOStringSafe(poll.start_at))
    : null;
  const endMs = poll.end_at ? Date.parse(toISOStringSafe(poll.end_at)) : null;

  if (startMs !== null && nowMs < startMs)
    throw new HttpException("Poll is not open yet", 403);
  if (endMs !== null && nowMs > endMs)
    throw new HttpException("Poll has already ended", 403);
  if (!poll.allow_vote_change)
    throw new HttpException("Vote changes are not allowed for this poll", 403);

  // User eligibility checks
  const user = await MyGlobal.prisma.econ_discuss_users.findUnique({
    where: { id: member.id },
  });
  if (!user || user.deleted_at !== null)
    throw new HttpException("User not found or inactive", 403);

  if (
    poll.min_voter_reputation !== null &&
    poll.min_voter_reputation !== undefined
  ) {
    const rep = await MyGlobal.prisma.econ_discuss_user_reputations.findUnique({
      where: { user_id: member.id },
    });
    const score = rep ? rep.score : 0;
    if (score < poll.min_voter_reputation)
      throw new HttpException("Insufficient reputation to participate", 403);
  }

  if (
    poll.min_account_age_hours !== null &&
    poll.min_account_age_hours !== undefined
  ) {
    const userCreatedMs = Date.parse(toISOStringSafe(user.created_at));
    const ageHours = Math.floor((nowMs - userCreatedMs) / (60 * 60 * 1000));
    if (ageHours < poll.min_account_age_hours)
      throw new HttpException(
        "Account age does not meet minimum requirement",
        403,
      );
  }

  // Find or create response
  let response = await MyGlobal.prisma.econ_discuss_poll_responses.findUnique({
    where: { id: responseId },
  });
  if (!response) {
    response = await MyGlobal.prisma.econ_discuss_poll_responses.create({
      data: {
        id: responseId,
        econ_discuss_poll_id: poll.id,
        econ_discuss_user_id: member.id,
        status: "active",
        likert_value: null,
        numeric_value: null,
        withdrawn_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }

  // Ownership and linkage checks
  if (response.econ_discuss_poll_id !== poll.id)
    throw new HttpException("Response does not belong to this poll/post", 400);
  if (response.econ_discuss_user_id !== member.id)
    throw new HttpException("Forbidden: not the owner of this response", 403);
  if (response.status !== "active")
    throw new HttpException("Response is not active", 403);

  // Validate incoming selections
  const incoming = body.selections;
  const incomingIds = incoming.map((s) => s.optionId);
  const incomingIdSet = new Set(incomingIds);
  if (incomingIdSet.size !== incomingIds.length)
    throw new HttpException("Duplicate optionId in request", 409);

  // Ensure all options exist and belong to poll
  const options = await MyGlobal.prisma.econ_discuss_poll_options.findMany({
    where: {
      id: { in: incomingIds },
      econ_discuss_poll_id: poll.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (options.length !== incomingIds.length)
    throw new HttpException(
      "One or more options are invalid for this poll",
      400,
    );

  // Existing selections
  const existingSelections =
    await MyGlobal.prisma.econ_discuss_poll_response_options.findMany({
      where: { econ_discuss_poll_response_id: response.id, deleted_at: null },
      select: { econ_discuss_poll_option_id: true, position: true },
    });
  const existingIds = new Set(
    existingSelections.map((r) => r.econ_discuss_poll_option_id),
  );
  for (const oid of incomingIds)
    if (existingIds.has(oid))
      throw new HttpException("Option already selected", 409);

  // Question type rules
  const qtype = poll.question_type;
  if (qtype === "single_choice")
    throw new HttpException("Use replacement endpoint for single_choice", 400);
  if (qtype === "likert" || qtype === "numeric_estimate")
    throw new HttpException(
      "Options cannot be added for this question type",
      400,
    );

  if (
    qtype === "multiple_choice" &&
    poll.max_selections !== null &&
    poll.max_selections !== undefined
  ) {
    const totalAfter = existingSelections.length + incoming.length;
    if (totalAfter > poll.max_selections)
      throw new HttpException("Max selections exceeded", 400);
  }

  if (qtype === "ranking") {
    const providedPositions = incoming.map((s) => s.position ?? null);
    if (providedPositions.some((p) => p === null || p === undefined))
      throw new HttpException(
        "Ranking requires positions for all selections",
        400,
      );
    const posNums = providedPositions as number[];
    if (posNums.some((p) => p < 1))
      throw new HttpException("Ranking positions must be >= 1", 400);
    const posSet = new Set<number>(posNums);
    if (posSet.size !== posNums.length)
      throw new HttpException("Duplicate ranking positions in request", 400);
    const existingPosSet = new Set<number>(
      existingSelections
        .map((r) => r.position)
        .filter((p): p is number => p !== null && p !== undefined),
    );
    for (const p of posNums)
      if (existingPosSet.has(p))
        throw new HttpException("Ranking position already taken", 400);
  }

  // Append selections atomically
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.econ_discuss_poll_response_options.createMany({
      data: incoming.map((s) => ({
        id: v4() as string & tags.Format<"uuid">,
        econ_discuss_poll_response_id: response!.id,
        econ_discuss_poll_option_id: s.optionId,
        position: qtype === "ranking" ? (s.position ?? null) : null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
      skipDuplicates: false,
    });
    await tx.econ_discuss_poll_responses.update({
      where: { id: response!.id },
      data: { updated_at: now },
    });
  });

  // Return updated response
  const updated =
    await MyGlobal.prisma.econ_discuss_poll_responses.findUniqueOrThrow({
      where: { id: response.id },
    });
  const selRows =
    await MyGlobal.prisma.econ_discuss_poll_response_options.findMany({
      where: { econ_discuss_poll_response_id: response.id, deleted_at: null },
      select: { id: true, econ_discuss_poll_option_id: true, position: true },
      orderBy: { created_at: "asc" },
    });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    pollId: updated.econ_discuss_poll_id as string & tags.Format<"uuid">,
    userId: updated.econ_discuss_user_id as string & tags.Format<"uuid">,
    status: updated.status as IEEconDiscussPollResponseStatus,
    likertValue: updated.likert_value ?? null,
    numericValue: updated.numeric_value ?? null,
    withdrawnAt: updated.withdrawn_at
      ? toISOStringSafe(updated.withdrawn_at)
      : null,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    selections: selRows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      optionId: r.econ_discuss_poll_option_id as string & tags.Format<"uuid">,
      position: r.position ?? null,
    })),
  };
}
