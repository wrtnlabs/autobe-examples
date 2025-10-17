import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPollResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResult";
import { IESegmentBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IESegmentBy";
import { IEPollResponseStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPollResponseStatus";
import { IEQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEQuestionType";
import { IEVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEVisibilityMode";
import { IEconDiscussPollResults } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResults";

export async function patchEconDiscussPostsPostIdPollResults(props: {
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPollResult.IRequest;
}): Promise<IEconDiscussPollResult> {
  const { postId, body } = props;

  const poll = await MyGlobal.prisma.econ_discuss_polls.findFirst({
    where: {
      econ_discuss_post_id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      econ_discuss_post_id: true,
      question: true,
      question_type: true,
      visibility_mode: true,
      expert_only: true,
      end_at: true,
      deleted_at: true,
    },
  });

  if (!poll) {
    throw new HttpException("Poll not found for the given postId", 404);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const endAtIso: (string & tags.Format<"date-time">) | null = poll.end_at
    ? toISOStringSafe(poll.end_at)
    : null;

  if (poll.visibility_mode === "hidden_until_close") {
    if (endAtIso === null || endAtIso > now) {
      throw new HttpException("Results are hidden until the poll ends", 409);
    }
  } else if (poll.visibility_mode === "visible_after_vote") {
    // Without authenticated user context in props, per-user vote gating cannot be verified.
    // Allow only after poll has ended; otherwise deny.
    if (endAtIso === null || endAtIso > now) {
      throw new HttpException(
        "Results are visible only after you vote while the poll is open",
        403,
      );
    }
  } else if (poll.visibility_mode !== "always_visible") {
    throw new HttpException("Unsupported visibility mode", 400);
  }

  // Build eligible statuses
  const baseStatuses: IEPollResponseStatus[] = ["active"];
  const statusesWithQuarantine: IEPollResponseStatus[] =
    body.includeQuarantined === true
      ? [...baseStatuses, typia.assert<IEPollResponseStatus>("quarantined")]
      : baseStatuses;

  const allowedStatuses: IEPollResponseStatus[] = statusesWithQuarantine.filter(
    (s) =>
      Array.isArray(body.excludeStatuses) && body.excludeStatuses !== null
        ? !body.excludeStatuses.includes(s)
        : true,
  );

  // Date range filters
  const since = body.since ?? undefined;
  const until = body.until ?? undefined;

  // Total eligible responses
  const totalResponses =
    await MyGlobal.prisma.econ_discuss_poll_responses.count({
      where: {
        econ_discuss_poll_id: poll.id,
        deleted_at: null,
        status: { in: allowedStatuses },
        ...(since !== undefined || until !== undefined
          ? {
              created_at: {
                ...(since !== undefined && { gte: since }),
                ...(until !== undefined && { lte: until }),
              },
            }
          : {}),
      },
    });

  // Option-level breakdown for option-based types
  const isOptionType =
    poll.question_type === "single_choice" ||
    poll.question_type === "multiple_choice";

  let optionAgg: IEconDiscussPollResults.IOption[] | undefined = undefined;
  if (isOptionType && (body.includeOptionBreakdown ?? true)) {
    const options = await MyGlobal.prisma.econ_discuss_poll_options.findMany({
      where: {
        econ_discuss_poll_id: poll.id,
        deleted_at: null,
      },
      select: { id: true, option_text: true, position: true },
      orderBy: { position: "asc" },
    });

    const agg: IEconDiscussPollResults.IOption[] = [];
    for (const opt of options) {
      const count =
        await MyGlobal.prisma.econ_discuss_poll_response_options.count({
          where: {
            econ_discuss_poll_option_id: opt.id,
            deleted_at: null,
            response: {
              econ_discuss_poll_id: poll.id,
              deleted_at: null,
              status: { in: allowedStatuses },
              ...(since !== undefined || until !== undefined
                ? {
                    created_at: {
                      ...(since !== undefined && { gte: since }),
                      ...(until !== undefined && { lte: until }),
                    },
                  }
                : {}),
            },
          },
        });

      const percent =
        Number(totalResponses) > 0
          ? (Number(count) / Number(totalResponses)) * 100
          : 0;
      agg.push({
        optionId: opt.id as string & tags.Format<"uuid">,
        optionText: opt.option_text,
        count: Number(count) as number & tags.Type<"int32">,
        percent,
      });
    }
    optionAgg = agg;
  }

  const result: IEconDiscussPollResult = {
    pollId: poll.id as string & tags.Format<"uuid">,
    postId,
    question: poll.question ?? null,
    questionType: poll.question_type as IEQuestionType,
    visibilityMode: poll.visibility_mode as IEVisibilityMode,
    expertOnly: poll.expert_only ?? undefined,
    totalResponses: Number(totalResponses) as number & tags.Type<"int32">,
    computedAt: now,
    options: optionAgg ?? undefined,
    likert: undefined,
    numeric: undefined,
    ranking: undefined,
    segments: undefined,
  };

  return result;
}
