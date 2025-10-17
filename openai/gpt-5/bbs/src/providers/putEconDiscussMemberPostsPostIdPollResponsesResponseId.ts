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

export async function putEconDiscussMemberPostsPostIdPollResponsesResponseId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
  body: IEconDiscussPollResponse.IUpdate;
}): Promise<IEconDiscussPollResponse> {
  const { member, postId, responseId, body } = props;

  const existing = await MyGlobal.prisma.econ_discuss_poll_responses.findUnique(
    {
      where: { id: responseId },
      include: {
        poll: {
          select: {
            id: true,
            econ_discuss_post_id: true,
            question_type: true,
            allow_vote_change: true,
            start_at: true,
            end_at: true,
            scale_points: true,
            numeric_min: true,
            numeric_max: true,
            numeric_step: true,
          },
        },
      },
    },
  );
  if (!existing) throw new HttpException("Not Found", 404);

  if (existing.poll.econ_discuss_post_id !== postId) {
    throw new HttpException("Not Found", 404);
  }

  if (existing.econ_discuss_user_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const nowMs = Date.now();
  const pollEndMs = existing.poll.end_at
    ? existing.poll.end_at.getTime()
    : null;
  const pollClosed = pollEndMs !== null && pollEndMs <= nowMs;
  if (pollClosed && !existing.poll.allow_vote_change) {
    throw new HttpException(
      "Bad Request: Poll is closed and changes are not allowed",
      400,
    );
  }

  const qtype = existing.poll.question_type;
  if (qtype === "likert") {
    if (body.numericValue !== undefined && body.numericValue !== null) {
      throw new HttpException(
        "Bad Request: numericValue not allowed for likert polls",
        400,
      );
    }
    if (body.likertValue !== undefined && body.likertValue !== null) {
      const sp = existing.poll.scale_points;
      if (sp === null || sp === undefined) {
        throw new HttpException(
          "Bad Request: Poll scale_points is not configured",
          400,
        );
      }
      if (body.likertValue < 1 || body.likertValue > sp) {
        throw new HttpException("Bad Request: likertValue out of range", 400);
      }
    }
  } else if (qtype === "numeric_estimate") {
    if (body.likertValue !== undefined && body.likertValue !== null) {
      throw new HttpException(
        "Bad Request: likertValue not allowed for numeric_estimate polls",
        400,
      );
    }
    if (body.numericValue !== undefined && body.numericValue !== null) {
      const val = body.numericValue;
      const min = existing.poll.numeric_min;
      const max = existing.poll.numeric_max;
      const step = existing.poll.numeric_step;
      if (min !== null && min !== undefined && val < min) {
        throw new HttpException("Bad Request: numericValue below minimum", 400);
      }
      if (max !== null && max !== undefined && val > max) {
        throw new HttpException("Bad Request: numericValue above maximum", 400);
      }
      if (step !== null && step !== undefined && step > 0) {
        const base = min ?? 0;
        const ratio = Math.abs((val - base) / step);
        const nearest = Math.round(ratio);
        const epsilon = 1e-9;
        if (Math.abs(ratio - nearest) > epsilon) {
          throw new HttpException(
            "Bad Request: numericValue does not align with numeric_step",
            400,
          );
        }
      }
    }
  } else {
    if (
      (body.likertValue !== undefined && body.likertValue !== null) ||
      (body.numericValue !== undefined && body.numericValue !== null)
    ) {
      throw new HttpException(
        "Bad Request: Scalar values not editable for this question type",
        400,
      );
    }
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.econ_discuss_poll_responses.update({
    where: { id: responseId },
    data: {
      status: body.status ?? undefined,
      likert_value: body.likertValue ?? undefined,
      numeric_value: body.numericValue ?? undefined,
      withdrawn_at:
        body.status === undefined
          ? undefined
          : body.status === "withdrawn"
            ? now
            : null,
      updated_at: now,
    },
  });

  const selections =
    await MyGlobal.prisma.econ_discuss_poll_response_options.findMany({
      where: {
        econ_discuss_poll_response_id: responseId,
        deleted_at: null,
      },
      orderBy: [{ position: "asc" as const }, { created_at: "asc" as const }],
      select: {
        id: true,
        econ_discuss_poll_option_id: true,
        position: true,
      },
    });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    pollId: updated.econ_discuss_poll_id as string & tags.Format<"uuid">,
    userId: updated.econ_discuss_user_id as string & tags.Format<"uuid">,
    status: updated.status as IEEconDiscussPollResponseStatus,
    likertValue: updated.likert_value ?? undefined,
    numericValue: updated.numeric_value ?? undefined,
    withdrawnAt: updated.withdrawn_at
      ? toISOStringSafe(updated.withdrawn_at)
      : undefined,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    selections: selections.map((s) => ({
      id: s.id as string & tags.Format<"uuid">,
      optionId: s.econ_discuss_poll_option_id as string & tags.Format<"uuid">,
      position: s.position ?? undefined,
    })),
  };
}
