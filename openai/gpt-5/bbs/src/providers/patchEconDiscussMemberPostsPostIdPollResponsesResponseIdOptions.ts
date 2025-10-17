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

export async function patchEconDiscussMemberPostsPostIdPollResponsesResponseIdOptions(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
  body: IEconDiscussPollResponseOption.IRequest;
}): Promise<IEconDiscussPollResponse> {
  const { member, postId, responseId, body } = props;

  // 1) Load target response under post + ownership, include poll
  const response = await MyGlobal.prisma.econ_discuss_poll_responses.findFirst({
    where: {
      id: responseId,
      econ_discuss_user_id: member.id,
      deleted_at: null,
      poll: { is: { econ_discuss_post_id: postId, deleted_at: null } },
    },
    include: { poll: true },
  });
  if (!response)
    throw new HttpException("Response not found or not owned by you", 404);

  const poll = response.poll;
  if (!poll) throw new HttpException("Poll not found for response", 404);

  // 2) Permission/eligibility/window checks
  if (poll.allow_vote_change !== true) {
    throw new HttpException("Vote change is not allowed for this poll", 403);
  }

  const nowIso = toISOStringSafe(new Date());
  const startIso = poll.start_at ? toISOStringSafe(poll.start_at) : null;
  const endIso = poll.end_at ? toISOStringSafe(poll.end_at) : null;
  if (startIso !== null && nowIso < startIso) {
    throw new HttpException("Poll has not started yet", 403);
  }
  if (endIso !== null && nowIso > endIso) {
    throw new HttpException("Poll is closed", 403);
  }

  // Enforce eligibility: min reputation
  if (
    poll.min_voter_reputation !== null &&
    poll.min_voter_reputation !== undefined
  ) {
    const rep = await MyGlobal.prisma.econ_discuss_user_reputations.findFirst({
      where: { user_id: member.id, deleted_at: null },
    });
    const score = rep ? rep.score : 0;
    if (score < poll.min_voter_reputation) {
      throw new HttpException(
        "Insufficient reputation to modify selections",
        403,
      );
    }
  }

  // Enforce eligibility: min account age hours
  if (
    poll.min_account_age_hours !== null &&
    poll.min_account_age_hours !== undefined
  ) {
    const user = await MyGlobal.prisma.econ_discuss_users.findUnique({
      where: { id: member.id },
    });
    if (!user || user.deleted_at !== null) {
      throw new HttpException("User is not active", 403);
    }
    const createdIso = toISOStringSafe(user.created_at);
    const ageMs = Date.parse(nowIso) - Date.parse(createdIso);
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    if (ageHours < poll.min_account_age_hours) {
      throw new HttpException("Account age requirement not met", 403);
    }
  }

  // 3) Normalize input selections and validate question type
  type Normalized = {
    optionId: string & tags.Format<"uuid">;
    position: number | null;
  };
  let normalized: Normalized[] = [];

  const qType = poll.question_type;
  const isOptionBased =
    qType === "single_choice" ||
    qType === "multiple_choice" ||
    qType === "ranking";
  if (!isOptionBased) {
    throw new HttpException(
      "This poll question type does not accept option selections",
      400,
    );
  }

  if ("optionIds" in body) {
    if (qType === "ranking") {
      throw new HttpException(
        "Ranking poll requires selections with positions",
        400,
      );
    }
    const uniqueOptionIds = Array.from(new Set(body.optionIds));
    if (uniqueOptionIds.length !== body.optionIds.length) {
      throw new HttpException("Duplicate optionIds are not allowed", 400);
    }
    normalized = uniqueOptionIds.map((oid) => ({
      optionId: oid,
      position: null,
    }));
  } else if ("selections" in body) {
    if (qType !== "ranking") {
      throw new HttpException(
        "Non-ranking poll does not accept positions",
        400,
      );
    }
    const positions = body.selections.map((s) => s.position);
    const posSet = new Set(positions);
    if (posSet.size !== positions.length) {
      throw new HttpException(
        "Duplicate ranking positions are not allowed",
        400,
      );
    }
    // positions must be within 1..N
    const n = positions.length;
    for (const p of positions) {
      if (p < 1 || p > n) {
        throw new HttpException("Ranking positions must be within 1..N", 400);
      }
    }
    // OptionIds should be unique as well
    const optionIds = body.selections.map((s) => s.optionId);
    const oidSet = new Set(optionIds);
    if (oidSet.size !== optionIds.length) {
      throw new HttpException("Duplicate optionId in ranking selections", 400);
    }
    normalized = body.selections.map((s) => ({
      optionId: s.optionId,
      position: s.position as number,
    }));
  } else {
    throw new HttpException("Invalid request body", 400);
  }

  // 4) Validate options belong to this poll
  const providedIds = normalized.map((n) => n.optionId);
  const validOptions = await MyGlobal.prisma.econ_discuss_poll_options.findMany(
    {
      where: {
        econ_discuss_poll_id: poll.id,
        id: { in: providedIds },
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (validOptions.length !== providedIds.length) {
    throw new HttpException(
      "One or more options do not belong to this poll",
      400,
    );
  }

  // 5) Enforce min/max or single-choice constraints
  if (qType === "single_choice") {
    if (normalized.length !== 1) {
      throw new HttpException("single_choice requires exactly one option", 400);
    }
  }
  if (qType === "multiple_choice") {
    const count = normalized.length;
    if (
      poll.min_selections !== null &&
      poll.min_selections !== undefined &&
      count < poll.min_selections
    ) {
      throw new HttpException("Below min selections", 400);
    }
    if (
      poll.max_selections !== null &&
      poll.max_selections !== undefined &&
      count > poll.max_selections
    ) {
      throw new HttpException("Exceeds max selections", 400);
    }
  }

  // 6) Replace in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.econ_discuss_poll_response_options.deleteMany({
      where: { econ_discuss_poll_response_id: response.id },
    });

    for (const sel of normalized) {
      await tx.econ_discuss_poll_response_options.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          econ_discuss_poll_response_id: response.id as string &
            tags.Format<"uuid">,
          econ_discuss_poll_option_id: sel.optionId,
          position: sel.position === null ? null : sel.position,
          created_at: nowIso,
          updated_at: nowIso,
        },
      });
    }

    await tx.econ_discuss_poll_responses.update({
      where: { id: response.id },
      data: { updated_at: nowIso },
    });
  });

  // 7) Fetch updated response and selections
  const updated = await MyGlobal.prisma.econ_discuss_poll_responses.findUnique({
    where: { id: response.id },
  });
  if (!updated) throw new HttpException("Updated response missing", 500);

  const rows =
    await MyGlobal.prisma.econ_discuss_poll_response_options.findMany({
      where: { econ_discuss_poll_response_id: response.id },
      orderBy: { created_at: "asc" },
    });

  // 8) Build DTO
  const result: IEconDiscussPollResponse = {
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
    selections: rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      optionId: r.econ_discuss_poll_option_id as string & tags.Format<"uuid">,
      position: r.position ?? null,
    })),
  };

  return result;
}
