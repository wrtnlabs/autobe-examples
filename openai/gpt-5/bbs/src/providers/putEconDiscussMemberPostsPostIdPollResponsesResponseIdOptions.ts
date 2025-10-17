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

export async function putEconDiscussMemberPostsPostIdPollResponsesResponseIdOptions(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
  body: IEconDiscussPollResponseOption.IRequest;
}): Promise<IEconDiscussPollResponse> {
  const { member, postId, responseId, body } = props;

  // 1) Load poll by postId (must exist and be active)
  const poll = await MyGlobal.prisma.econ_discuss_polls.findFirst({
    where: {
      econ_discuss_post_id: postId,
      deleted_at: null,
    },
  });
  if (!poll) throw new HttpException("Poll not found for the given post", 404);

  // 2) Load response by id and poll (must exist and be active)
  const response = await MyGlobal.prisma.econ_discuss_poll_responses.findFirst({
    where: {
      id: responseId,
      econ_discuss_poll_id: poll.id,
      deleted_at: null,
    },
  });
  if (!response)
    throw new HttpException(
      "Response not found under the specified post's poll",
      404,
    );

  // 3) Ownership enforcement
  if (response.econ_discuss_user_id !== member.id) {
    throw new HttpException(
      "Forbidden: You can only modify your own poll response",
      403,
    );
  }

  // 4) Time window enforcement (use Date.parse on ISO strings to avoid Date typing)
  const nowMs = Date.now();
  const startMs = poll.start_at
    ? Date.parse(toISOStringSafe(poll.start_at))
    : null;
  const endMs = poll.end_at ? Date.parse(toISOStringSafe(poll.end_at)) : null;
  if (startMs !== null && nowMs < startMs) {
    throw new HttpException("Poll has not started yet", 403);
  }
  if (endMs !== null && nowMs > endMs) {
    throw new HttpException("Poll has already ended", 403);
  }

  // 5) Eligibility
  if (poll.expert_only) {
    const expert =
      await MyGlobal.prisma.econ_discuss_verified_experts.findFirst({
        where: {
          user_id: member.id,
          deleted_at: null,
        },
      });
    if (!expert) {
      throw new HttpException("Forbidden: Expert-only poll", 403);
    }
    const validUntilMs = expert.badge_valid_until
      ? Date.parse(toISOStringSafe(expert.badge_valid_until))
      : null;
    if (validUntilMs !== null && nowMs > validUntilMs) {
      throw new HttpException("Forbidden: Expert badge expired", 403);
    }
  }
  if (poll.min_voter_reputation !== null) {
    const rep = await MyGlobal.prisma.econ_discuss_user_reputations.findFirst({
      where: {
        user_id: member.id,
        deleted_at: null,
      },
    });
    const score = rep ? rep.score : 0;
    if (score < poll.min_voter_reputation) {
      throw new HttpException(
        "Forbidden: Reputation too low for this poll",
        403,
      );
    }
  }
  if (poll.min_account_age_hours !== null) {
    const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
      where: { id: member.id, deleted_at: null },
    });
    if (!user) throw new HttpException("User not found", 404);
    const ageHours = Math.floor(
      (nowMs - Date.parse(toISOStringSafe(user.created_at))) / 3_600_000,
    );
    if (ageHours < poll.min_account_age_hours) {
      throw new HttpException(
        "Forbidden: Account age does not meet requirement",
        403,
      );
    }
  }

  // 6) Normalize request body into selection list
  const questionType = poll.question_type;
  type Sel = { optionId: string; position: number | null };
  let requested: Sel[] = [];

  if ("optionIds" in body) {
    if (questionType === "ranking") {
      throw new HttpException(
        "Ranking polls require selections with positions",
        400,
      );
    }
    const uniqueIds = Array.from(new Set(body.optionIds));
    if (questionType === "single_choice") {
      if (uniqueIds.length !== 1) {
        throw new HttpException(
          "single_choice poll requires exactly one optionId",
          400,
        );
      }
    } else {
      // multiple_choice
      if (
        poll.min_selections !== null &&
        uniqueIds.length < poll.min_selections
      ) {
        throw new HttpException("Too few selections for this poll", 400);
      }
      if (
        poll.max_selections !== null &&
        uniqueIds.length > poll.max_selections
      ) {
        throw new HttpException("Too many selections for this poll", 400);
      }
    }
    requested = uniqueIds.map((id) => ({ optionId: id, position: null }));
  } else if ("selections" in body) {
    if (questionType !== "ranking") {
      throw new HttpException(
        "Only ranking polls accept selections with positions",
        400,
      );
    }
    const ids = body.selections.map((s) => s.optionId);
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length !== ids.length) {
      throw new HttpException(
        "Duplicate optionId detected in ranking selections",
        400,
      );
    }
    const positions = body.selections.map((s) => s.position);
    const uniquePositions = Array.from(new Set(positions));
    if (uniquePositions.length !== positions.length) {
      throw new HttpException(
        "Duplicate position detected in ranking selections",
        400,
      );
    }
    const n = positions.length;
    for (const p of positions) {
      if (p < 1 || p > n) {
        throw new HttpException("Ranking positions must be within 1..N", 400);
      }
    }
    requested = body.selections.map((s) => ({
      optionId: s.optionId,
      position: s.position,
    }));
  } else {
    throw new HttpException("Invalid request variant", 400);
  }

  // 7) Validate optionIds belong to the poll and exist
  const optionIds = requested.map((r) => r.optionId);
  const uniqueOptionIds = Array.from(new Set(optionIds));
  const options = await MyGlobal.prisma.econ_discuss_poll_options.findMany({
    where: {
      id: { in: uniqueOptionIds },
      econ_discuss_poll_id: poll.id,
      deleted_at: null,
    },
  });
  if (options.length !== uniqueOptionIds.length) {
    throw new HttpException(
      "One or more optionIds do not belong to this poll",
      400,
    );
  }

  // 8) Load existing selections (active only)
  const existing =
    await MyGlobal.prisma.econ_discuss_poll_response_options.findMany({
      where: {
        econ_discuss_poll_response_id: response.id,
        deleted_at: null,
      },
    });

  // 9) Enforce allow_vote_change when changing from an existing set
  const sameAsExisting = (() => {
    if (questionType === "ranking") {
      if (existing.length !== requested.length) return false;
      const map = new Map<string, number | null>();
      for (const e of existing)
        map.set(e.econ_discuss_poll_option_id, e.position ?? null);
      for (const r of requested)
        if (map.get(r.optionId) !== r.position) return false;
      return true;
    } else {
      const existingIds = existing
        .map((e) => e.econ_discuss_poll_option_id)
        .sort();
      const reqIds = uniqueOptionIds.slice().sort();
      if (existingIds.length !== reqIds.length) return false;
      for (let i = 0; i < existingIds.length; i++)
        if (existingIds[i] !== reqIds[i]) return false;
      return true;
    }
  })();
  if (
    existing.length > 0 &&
    !sameAsExisting &&
    poll.allow_vote_change === false
  ) {
    throw new HttpException("Vote change is not allowed for this poll", 403);
  }

  // 10) Apply replacement atomically
  const nowIso = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    // a) Soft-delete rows not present in the new set
    const keepSet = new Set<string>(uniqueOptionIds);
    const toRemove = existing
      .filter((e) => !keepSet.has(e.econ_discuss_poll_option_id))
      .map((e) => e.id);
    if (toRemove.length > 0) {
      await tx.econ_discuss_poll_response_options.updateMany({
        where: { id: { in: toRemove } },
        data: { deleted_at: nowIso, updated_at: nowIso },
      });
    }

    // b) Upsert/update each requested selection
    for (const sel of requested) {
      const found = existing.find(
        (e) => e.econ_discuss_poll_option_id === sel.optionId,
      );
      if (found) {
        await tx.econ_discuss_poll_response_options.update({
          where: { id: found.id },
          data: {
            position: sel.position ?? null,
            updated_at: nowIso,
            deleted_at: null,
          },
        });
      } else {
        await tx.econ_discuss_poll_response_options.create({
          data: {
            id: v4(),
            econ_discuss_poll_response_id: response.id,
            econ_discuss_poll_option_id: sel.optionId,
            position: sel.position ?? null,
            created_at: nowIso,
            updated_at: nowIso,
            deleted_at: null,
          },
        });
      }
    }

    // c) Touch response.updated_at
    await tx.econ_discuss_poll_responses.update({
      where: { id: response.id },
      data: { updated_at: nowIso },
    });
  });

  // 11) Reload updated response and selections
  const updated =
    await MyGlobal.prisma.econ_discuss_poll_responses.findUniqueOrThrow({
      where: { id: response.id },
    });
  const rows =
    await MyGlobal.prisma.econ_discuss_poll_response_options.findMany({
      where: { econ_discuss_poll_response_id: response.id, deleted_at: null },
      orderBy: { position: "asc" },
    });

  // 12) Assemble DTO
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
