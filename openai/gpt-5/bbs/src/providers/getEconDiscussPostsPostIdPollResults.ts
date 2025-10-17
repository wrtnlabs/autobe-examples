import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPollResults } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResults";
import { IEQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEQuestionType";
import { IEVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEVisibilityMode";

export async function getEconDiscussPostsPostIdPollResults(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussPollResults> {
  const { postId } = props;

  const poll = await MyGlobal.prisma.econ_discuss_polls.findFirst({
    where: { econ_discuss_post_id: postId },
    select: {
      id: true,
      econ_discuss_post_id: true,
      question: true,
      question_type: true,
      visibility_mode: true,
      expert_only: true,
      start_at: true,
      end_at: true,
      deleted_at: true,
    },
  });

  if (!poll) throw new HttpException("Not Found", 404);

  // Visibility enforcement
  const nowIso = toISOStringSafe(new Date());
  const endIso = poll.end_at ? toISOStringSafe(poll.end_at) : null;
  if (poll.visibility_mode === "hidden_until_close") {
    if (endIso === null || endIso > nowIso) {
      throw new HttpException("Results are hidden until poll closes", 409);
    }
  } else if (poll.visibility_mode === "visible_after_vote") {
    // CONTRADICTION: No user context provided in props to verify if caller has voted
    throw new HttpException("Results are visible only to voters", 409);
  }

  // Load options (active)
  const options = await MyGlobal.prisma.econ_discuss_poll_options.findMany({
    where: { econ_discuss_poll_id: poll.id, deleted_at: null },
    orderBy: { position: "asc" },
    select: { id: true, option_text: true, position: true },
  });

  // Load eligible (active) responses
  const responses = await MyGlobal.prisma.econ_discuss_poll_responses.findMany({
    where: {
      econ_discuss_poll_id: poll.id,
      status: "active",
      deleted_at: null,
    },
    select: { id: true, likert_value: true, numeric_value: true },
  });

  const totalResponses = responses.length;

  // Initialize aggregates
  let optionsAgg: IEconDiscussPollResults.IOption[] | null | undefined =
    undefined;
  let likertAgg: IEconDiscussPollResults.ILikert | null | undefined = undefined;
  let numericAgg: IEconDiscussPollResults.INumericSummary | null | undefined =
    undefined;
  let rankingAgg: IEconDiscussPollResults.IRankingSummary | null | undefined =
    undefined;

  const qType = poll.question_type as IEQuestionType;

  // Helper: percentage safe
  const percentOf = (count: number, base: number): number => {
    if (base <= 0) return 0;
    return (count / base) * 100;
  };

  if (
    qType === "single_choice" ||
    qType === "multiple_choice" ||
    qType === "ranking"
  ) {
    const responseIds = responses.map((r) => r.id);
    const selections = responseIds.length
      ? await MyGlobal.prisma.econ_discuss_poll_response_options.findMany({
          where: {
            econ_discuss_poll_response_id: { in: responseIds },
            deleted_at: null,
          },
          select: {
            econ_discuss_poll_response_id: true,
            econ_discuss_poll_option_id: true,
            position: true,
          },
        })
      : [];

    // Per-option counts
    const countByOption = new Map<string, number>();
    for (const opt of options) countByOption.set(opt.id, 0);
    for (const sel of selections) {
      countByOption.set(
        sel.econ_discuss_poll_option_id,
        (countByOption.get(sel.econ_discuss_poll_option_id) ?? 0) + 1,
      );
    }

    optionsAgg = options.map((opt) => {
      const count = countByOption.get(opt.id) ?? 0;
      return {
        optionId: opt.id as string & tags.Format<"uuid">,
        optionText: opt.option_text,
        count: Number(count) as number & tags.Type<"int32">,
        percent: percentOf(count, totalResponses),
      };
    });

    if (qType === "ranking") {
      // Ranking summary
      const firstPlaceByOption = new Map<string, number>();
      const posSumByOption = new Map<string, number>();
      const posCountByOption = new Map<string, number>();
      for (const opt of options) {
        firstPlaceByOption.set(opt.id, 0);
        posSumByOption.set(opt.id, 0);
        posCountByOption.set(opt.id, 0);
      }
      for (const sel of selections) {
        if (sel.position !== null && sel.position !== undefined) {
          posSumByOption.set(
            sel.econ_discuss_poll_option_id,
            (posSumByOption.get(sel.econ_discuss_poll_option_id) ?? 0) +
              sel.position,
          );
          posCountByOption.set(
            sel.econ_discuss_poll_option_id,
            (posCountByOption.get(sel.econ_discuss_poll_option_id) ?? 0) + 1,
          );
          if (sel.position === 1) {
            firstPlaceByOption.set(
              sel.econ_discuss_poll_option_id,
              (firstPlaceByOption.get(sel.econ_discuss_poll_option_id) ?? 0) +
                1,
            );
          }
        }
      }

      rankingAgg = {
        n: Number(totalResponses) as number & tags.Type<"int32">,
        options: options.map((opt) => {
          const fp = firstPlaceByOption.get(opt.id) ?? 0;
          const nPos = posCountByOption.get(opt.id) ?? 0;
          const sumPos = posSumByOption.get(opt.id) ?? 0;
          const avg = nPos > 0 ? sumPos / nPos : 0;
          return {
            optionId: opt.id as string & tags.Format<"uuid">,
            optionText: opt.option_text,
            firstPlaceCount: Number(fp) as number & tags.Type<"int32">,
            averagePosition: avg,
            n: Number(nPos) as number & tags.Type<"int32">,
          };
        }),
      };
    }
  }

  if (qType === "likert") {
    // scale_points is optional in schema; if absent, we cannot compute distribution
    const pollFull = await MyGlobal.prisma.econ_discuss_polls.findFirst({
      where: { id: poll.id },
      select: {
        scale_points: true,
        scale_min_label: true,
        scale_max_label: true,
        scale_mid_label: true,
      },
    });
    const scalePoints = pollFull?.scale_points ?? null;
    if (scalePoints && scalePoints > 0) {
      const counts: number[] = Array.from({ length: scalePoints }).map(() => 0);
      for (const r of responses) {
        if (r.likert_value !== null && r.likert_value !== undefined) {
          const idx = r.likert_value - 1;
          if (idx >= 0 && idx < counts.length) counts[idx] = counts[idx] + 1;
        }
      }
      likertAgg = {
        scalePoints: Number(scalePoints) as number & tags.Type<"int32">,
        minLabel: pollFull?.scale_min_label ?? null,
        maxLabel: pollFull?.scale_max_label ?? null,
        midLabel: pollFull?.scale_mid_label ?? null,
        counts: counts.map(
          (c) => Number(c) as number & tags.Type<"int32">,
        ) as (number & tags.Type<"int32">)[] & tags.MinItems<1>,
      };
    } else {
      likertAgg = undefined;
    }
  }

  if (qType === "numeric_estimate") {
    const values = responses
      .map((r) => r.numeric_value)
      .filter((v): v is number => v !== null && v !== undefined);
    const n = values.length;
    if (n > 0) {
      const sorted = [...values].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      const median =
        n % 2 === 1
          ? sorted[(n - 1) / 2]
          : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
      const variance =
        sorted.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / n;
      const stdDev = Math.sqrt(variance);
      const q1Index = (n - 1) * 0.25;
      const q3Index = (n - 1) * 0.75;
      const interp = (arr: number[], idx: number): number => {
        const lo = Math.floor(idx);
        const hi = Math.ceil(idx);
        if (lo === hi) return arr[lo];
        const frac = idx - lo;
        return arr[lo] * (1 - frac) + arr[hi] * frac;
      };
      const q1 = interp(sorted, q1Index);
      const q3 = interp(sorted, q3Index);
      numericAgg = {
        n: Number(n) as number & tags.Type<"int32">,
        mean,
        median,
        stdDev,
        iqr: q3 - q1,
        min: sorted[0],
        max: sorted[sorted.length - 1],
      };
    } else {
      numericAgg = {
        n: 0 as number & tags.Type<"int32">,
        mean: 0,
        median: 0,
        stdDev: 0,
        iqr: 0,
        min: 0,
        max: 0,
      };
    }
  }

  const result: IEconDiscussPollResults = {
    pollId: poll.id as string & tags.Format<"uuid">,
    postId: poll.econ_discuss_post_id as string & tags.Format<"uuid">,
    question: poll.question,
    questionType: qType,
    visibilityMode: poll.visibility_mode as IEVisibilityMode,
    expertOnly: poll.expert_only ?? undefined,
    totalResponses: Number(totalResponses) as number & tags.Type<"int32">,
    computedAt: toISOStringSafe(new Date()),
    options:
      qType === "single_choice" ||
      qType === "multiple_choice" ||
      qType === "ranking"
        ? (optionsAgg ?? [])
        : null,
    likert: qType === "likert" ? (likertAgg ?? null) : null,
    numeric: qType === "numeric_estimate" ? (numericAgg ?? null) : null,
    ranking: qType === "ranking" ? (rankingAgg ?? null) : null,
    segments: undefined,
  };

  return result;
}
