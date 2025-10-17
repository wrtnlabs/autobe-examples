import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPollResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponse";
import { IEPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPollQuestionType";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconDiscussMemberPostsPostIdPollResponses(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPollResponse.ICreate;
}): Promise<void> {
  const { member, postId, body } = props;

  const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: { id: postId satisfies string as string, deleted_at: null },
    select: { id: true },
  });
  if (!post) throw new HttpException("Post not found", 404);

  const poll = await MyGlobal.prisma.econ_discuss_polls.findUnique({
    where: { econ_discuss_post_id: postId satisfies string as string },
  });
  if (!poll || poll.deleted_at !== null)
    throw new HttpException("Poll not found", 404);

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const nowMs = new globalThis.Date(now).getTime();
  if (poll.start_at) {
    const startMs = new globalThis.Date(poll.start_at).getTime();
    if (nowMs < startMs)
      throw new HttpException("Poll has not started yet", 422);
  }
  if (poll.end_at) {
    const endMs = new globalThis.Date(poll.end_at).getTime();
    if (nowMs > endMs) throw new HttpException("Poll has ended", 422);
  }

  if (poll.expert_only) {
    const [expert, moderator, admin] = await Promise.all([
      MyGlobal.prisma.econ_discuss_verified_experts.findFirst({
        where: {
          user_id: member.id satisfies string as string,
          deleted_at: null,
        },
        select: { id: true },
      }),
      MyGlobal.prisma.econ_discuss_moderators.findFirst({
        where: {
          user_id: member.id satisfies string as string,
          deleted_at: null,
        },
        select: { id: true },
      }),
      MyGlobal.prisma.econ_discuss_admins.findFirst({
        where: {
          user_id: member.id satisfies string as string,
          deleted_at: null,
        },
        select: { id: true },
      }),
    ]);
    if (!expert && !moderator && !admin) {
      throw new HttpException("Forbidden: expert-only poll", 403);
    }
  }
  if (
    poll.min_voter_reputation !== null &&
    poll.min_voter_reputation !== undefined
  ) {
    const rep = await MyGlobal.prisma.econ_discuss_user_reputations.findFirst({
      where: {
        user_id: member.id satisfies string as string,
        deleted_at: null,
      },
      select: { score: true },
    });
    const score = rep ? rep.score : 0;
    if (score < poll.min_voter_reputation) {
      throw new HttpException("Forbidden: insufficient reputation", 403);
    }
  }
  if (
    poll.min_account_age_hours !== null &&
    poll.min_account_age_hours !== undefined
  ) {
    const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
      where: { id: member.id satisfies string as string, deleted_at: null },
      select: { created_at: true },
    });
    if (!user) throw new HttpException("User not found", 404);
    const createdMs = new globalThis.Date(user.created_at).getTime();
    const ageHours = (nowMs - createdMs) / (60 * 60 * 1000);
    if (ageHours < poll.min_account_age_hours) {
      throw new HttpException("Forbidden: account too new", 403);
    }
  }

  if (body.questionType !== poll.question_type) {
    throw new HttpException("Bad Request: questionType mismatch", 400);
  }

  const ensureOptionsBelongToPoll = async (optionIds: string[]) => {
    const uniqueIds = Array.from(new Set(optionIds));
    const options = await MyGlobal.prisma.econ_discuss_poll_options.findMany({
      where: {
        econ_discuss_poll_id: poll.id,
        id: { in: uniqueIds },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (options.length !== uniqueIds.length) {
      throw new HttpException("Bad Request: invalid optionId(s)", 400);
    }
    return uniqueIds;
  };

  let requestedKind: "single" | "multiple" | "ranking" | "likert" | "numeric" =
    "single";
  let requestedOptionIds: string[] = [];
  let requestedRanking: { optionId: string; position: number }[] = [];
  let requestedLikert: number | undefined = undefined;
  let requestedNumeric: number | undefined = undefined;

  switch (body.questionType) {
    case "single_choice": {
      requestedKind = "single";
      const single = typia.assert<{ optionId: string }>(body);
      requestedOptionIds = await ensureOptionsBelongToPoll([single.optionId]);
      break;
    }
    case "multiple_choice": {
      requestedKind = "multiple";
      const multiple = typia.assert<{ optionIds: string[] }>(body);
      const ids = await ensureOptionsBelongToPoll(multiple.optionIds);
      const count = ids.length;
      if (
        poll.min_selections !== null &&
        poll.min_selections !== undefined &&
        count < poll.min_selections
      ) {
        throw new HttpException("Bad Request: below min selections", 400);
      }
      if (
        poll.max_selections !== null &&
        poll.max_selections !== undefined &&
        count > poll.max_selections
      ) {
        throw new HttpException("Bad Request: above max selections", 400);
      }
      requestedOptionIds = ids;
      break;
    }
    case "ranking": {
      requestedKind = "ranking";
      const ranking = typia.assert<{
        rankings: { optionId: string; position: number | string }[];
      }>(body);
      requestedRanking = ranking.rankings.map((r) => ({
        optionId: r.optionId,
        position: Number(r.position),
      }));
      const positions = requestedRanking.map((r) => r.position);
      const positionSet = new Set(positions);
      if (positions.length === 0 || positionSet.size !== positions.length) {
        throw new HttpException(
          "Bad Request: duplicate or empty positions",
          400,
        );
      }
      const minPos = Math.min(...positions);
      const maxPos = Math.max(...positions);
      if (minPos !== 1 || maxPos !== positions.length) {
        throw new HttpException("Bad Request: positions must be 1..N", 400);
      }
      const ids = await ensureOptionsBelongToPoll(
        requestedRanking.map((r) => r.optionId),
      );
      requestedRanking = requestedRanking
        .filter((r) => ids.includes(r.optionId))
        .sort((a, b) => a.position - b.position);
      break;
    }
    case "likert": {
      requestedKind = "likert";
      if (poll.scale_points === null || poll.scale_points === undefined) {
        throw new HttpException("Bad Request: poll missing scale_points", 400);
      }
      const likert = typia.assert<{ likertValue: number | string }>(body);
      const value = Number(likert.likertValue);
      if (!(value >= 1 && value <= poll.scale_points)) {
        throw new HttpException("Bad Request: likertValue out of range", 400);
      }
      requestedLikert = value;
      break;
    }
    case "numeric_estimate": {
      requestedKind = "numeric";
      const numeric = typia.assert<{ numericValue: number | string }>(body);
      const value = Number(numeric.numericValue);
      if (
        poll.numeric_min !== null &&
        poll.numeric_min !== undefined &&
        value < poll.numeric_min
      ) {
        throw new HttpException("Bad Request: numericValue below minimum", 400);
      }
      if (
        poll.numeric_max !== null &&
        poll.numeric_max !== undefined &&
        value > poll.numeric_max
      ) {
        throw new HttpException("Bad Request: numericValue above maximum", 400);
      }
      if (poll.numeric_step !== null && poll.numeric_step !== undefined) {
        const step = poll.numeric_step;
        const base = 0;
        const multiples = Math.round((value - base) / step);
        const aligned = Math.abs(value - (base + multiples * step)) < 1e-9;
        if (!aligned) {
          throw new HttpException(
            "Bad Request: numericValue not aligned to step",
            400,
          );
        }
      }
      requestedNumeric = value;
      break;
    }
    default:
      throw new HttpException("Bad Request: unsupported questionType", 400);
  }

  const existing = await MyGlobal.prisma.econ_discuss_poll_responses.findUnique(
    {
      where: {
        econ_discuss_poll_id_econ_discuss_user_id: {
          econ_discuss_poll_id: poll.id,
          econ_discuss_user_id: member.id satisfies string as string,
        },
      },
      include: { econ_discuss_poll_response_options: true },
    },
  );

  const isIdempotent = (): boolean => {
    if (!existing) return false;
    if (requestedKind === "likert") {
      return (
        existing.likert_value !== null &&
        existing.likert_value === requestedLikert
      );
    }
    if (requestedKind === "numeric") {
      return (
        existing.numeric_value !== null &&
        existing.numeric_value === requestedNumeric
      );
    }
    const existingOptions = existing.econ_discuss_poll_response_options;
    if (requestedKind === "single") {
      const exIds = existingOptions.map((o) => o.econ_discuss_poll_option_id);
      return exIds.length === 1 && exIds[0] === requestedOptionIds[0];
    }
    if (requestedKind === "multiple") {
      const exSet = new Set(
        existingOptions.map((o) => o.econ_discuss_poll_option_id),
      );
      const reqSet = new Set(requestedOptionIds);
      if (exSet.size !== reqSet.size) return false;
      for (const id of reqSet) if (!exSet.has(id)) return false;
      return true;
    }
    if (requestedKind === "ranking") {
      const byId: Record<string, number | undefined> = {};
      for (const o of existingOptions) {
        byId[o.econ_discuss_poll_option_id] =
          o.position === null ? undefined : o.position;
      }
      if (requestedRanking.length !== existingOptions.length) return false;
      for (const r of requestedRanking) {
        if (byId[r.optionId] !== r.position) return false;
      }
      return true;
    }
    return false;
  };

  if (existing) {
    if (isIdempotent()) return;
    if (!poll.allow_vote_change) {
      throw new HttpException("Conflict: vote change not allowed", 409);
    }
  }

  await MyGlobal.prisma.$transaction(async (tx) => {
    if (!existing) {
      const responseId = v4();
      await tx.econ_discuss_poll_responses.create({
        data: {
          id: responseId,
          econ_discuss_poll_id: poll.id,
          econ_discuss_user_id: member.id satisfies string as string,
          status: "active",
          likert_value:
            requestedKind === "likert" ? (requestedLikert ?? null) : null,
          numeric_value:
            requestedKind === "numeric" ? (requestedNumeric ?? null) : null,
          withdrawn_at: null,
          created_at: now satisfies string as string,
          updated_at: now satisfies string as string,
          deleted_at: null,
        },
        select: { id: true },
      });

      if (
        requestedKind === "single" ||
        requestedKind === "multiple" ||
        requestedKind === "ranking"
      ) {
        if (requestedKind === "ranking") {
          await tx.econ_discuss_poll_response_options.createMany({
            data: requestedRanking.map((r) => ({
              id: v4(),
              econ_discuss_poll_response_id: responseId,
              econ_discuss_poll_option_id: r.optionId,
              position: r.position,
              created_at: now satisfies string as string,
              updated_at: now satisfies string as string,
              deleted_at: null,
            })),
          });
        } else {
          await tx.econ_discuss_poll_response_options.createMany({
            data: requestedOptionIds.map((optId) => ({
              id: v4(),
              econ_discuss_poll_response_id: responseId,
              econ_discuss_poll_option_id: optId,
              position: null,
              created_at: now satisfies string as string,
              updated_at: now satisfies string as string,
              deleted_at: null,
            })),
          });
        }
      }
    } else {
      await tx.econ_discuss_poll_responses.update({
        where: { id: existing.id },
        data: {
          status: "active",
          likert_value:
            requestedKind === "likert" ? (requestedLikert ?? null) : null,
          numeric_value:
            requestedKind === "numeric" ? (requestedNumeric ?? null) : null,
          withdrawn_at: null,
          updated_at: now satisfies string as string,
        },
        select: { id: true },
      });

      await tx.econ_discuss_poll_response_options.deleteMany({
        where: { econ_discuss_poll_response_id: existing.id },
      });
      if (requestedKind === "ranking") {
        await tx.econ_discuss_poll_response_options.createMany({
          data: requestedRanking.map((r) => ({
            id: v4(),
            econ_discuss_poll_response_id: existing.id,
            econ_discuss_poll_option_id: r.optionId,
            position: r.position,
            created_at: now satisfies string as string,
            updated_at: now satisfies string as string,
            deleted_at: null,
          })),
        });
      } else if (requestedKind === "single" || requestedKind === "multiple") {
        await tx.econ_discuss_poll_response_options.createMany({
          data: requestedOptionIds.map((optId) => ({
            id: v4(),
            econ_discuss_poll_response_id: existing.id,
            econ_discuss_poll_option_id: optId,
            position: null,
            created_at: now satisfies string as string,
            updated_at: now satisfies string as string,
            deleted_at: null,
          })),
        });
      }
    }
  });
}
