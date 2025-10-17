import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPoll";
import { IEconDiscussPollVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollVisibilityMode";
import { IEconDiscussPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollQuestionType";
import { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconDiscussMemberPostsPostIdPoll(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPoll.IUpdate;
}): Promise<IEconDiscussPoll> {
  const { member, postId, body } = props;

  const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true, econ_discuss_user_id: true },
  });
  if (!post) throw new HttpException("Post not found", 404);
  if (post.econ_discuss_user_id !== member.id) {
    throw new HttpException(
      "Forbidden: Only the post author can update the poll",
      403,
    );
  }

  const poll = await MyGlobal.prisma.econ_discuss_polls.findFirst({
    where: { econ_discuss_post_id: postId, deleted_at: null },
  });
  if (!poll) throw new HttpException("Poll not found", 404);

  const nowIso = toISOStringSafe(new Date());
  const pollStartIso = poll.start_at
    ? toISOStringSafe(poll.start_at)
    : undefined;
  const started = pollStartIso ? nowIso >= pollStartIso : false;

  const responsesExist =
    (await MyGlobal.prisma.econ_discuss_poll_responses.count({
      where: { econ_discuss_poll_id: poll.id, deleted_at: null },
    })) > 0;

  const structuralChanged =
    body.min_selections !== undefined ||
    body.max_selections !== undefined ||
    body.scale_points !== undefined ||
    body.numeric_min !== undefined ||
    body.numeric_max !== undefined ||
    body.numeric_step !== undefined;
  if ((responsesExist || started) && structuralChanged) {
    throw new HttpException(
      "Conflict: Structural changes are not allowed after poll start or once responses exist",
      409,
    );
  }

  const questionType: IEconDiscussPollQuestionType = (() => {
    switch (poll.question_type) {
      case "single_choice":
      case "multiple_choice":
      case "likert":
      case "ranking":
      case "numeric_estimate":
        return poll.question_type as IEconDiscussPollQuestionType;
      default:
        throw new HttpException("Invalid question_type in database", 500);
    }
  })();

  let optionsCount: number | undefined;
  if (questionType === "multiple_choice") {
    optionsCount = await MyGlobal.prisma.econ_discuss_poll_options.count({
      where: { econ_discuss_poll_id: poll.id, deleted_at: null },
    });
  }

  if (questionType === "multiple_choice") {
    const prospectiveMin =
      body.min_selections !== undefined
        ? body.min_selections
        : (poll.min_selections ?? 0);
    const prospectiveMax =
      body.max_selections !== undefined
        ? body.max_selections
        : (poll.max_selections ?? optionsCount ?? 0);
    if (prospectiveMin < 0)
      throw new HttpException(
        "Bad Request: min_selections cannot be negative",
        400,
      );
    if (prospectiveMax < 0)
      throw new HttpException(
        "Bad Request: max_selections cannot be negative",
        400,
      );
    if (optionsCount !== undefined) {
      if (prospectiveMin > prospectiveMax)
        throw new HttpException(
          "Bad Request: min_selections must be ≤ max_selections",
          400,
        );
      if (prospectiveMax > optionsCount)
        throw new HttpException(
          "Bad Request: max_selections cannot exceed options length",
          400,
        );
      if (prospectiveMin > optionsCount)
        throw new HttpException(
          "Bad Request: min_selections cannot exceed options length",
          400,
        );
    }
  } else {
    if (
      body.min_selections !== undefined ||
      body.max_selections !== undefined
    ) {
      throw new HttpException(
        "Bad Request: min/max selections only valid for multiple_choice",
        400,
      );
    }
  }

  if (questionType === "likert") {
    if (body.scale_points !== undefined && body.scale_points < 2) {
      throw new HttpException("Bad Request: scale_points must be ≥ 2", 400);
    }
  } else {
    if (
      body.scale_points !== undefined ||
      body.scale_min_label !== undefined ||
      body.scale_max_label !== undefined ||
      body.scale_mid_label !== undefined
    ) {
      throw new HttpException(
        "Bad Request: likert scale fields only valid for likert type",
        400,
      );
    }
  }

  if (questionType === "numeric_estimate") {
    const numMin =
      body.numeric_min !== undefined ? body.numeric_min : poll.numeric_min;
    const numMax =
      body.numeric_max !== undefined ? body.numeric_max : poll.numeric_max;
    if (
      numMin !== null &&
      numMin !== undefined &&
      numMax !== null &&
      numMax !== undefined
    ) {
      if (!(numMin < numMax)) {
        throw new HttpException(
          "Bad Request: numeric_min must be < numeric_max",
          400,
        );
      }
    }
    if (body.numeric_step !== undefined && !(body.numeric_step > 0)) {
      throw new HttpException("Bad Request: numeric_step must be > 0", 400);
    }
  } else {
    if (
      body.numeric_min !== undefined ||
      body.numeric_max !== undefined ||
      body.numeric_step !== undefined ||
      body.unit_label !== undefined
    ) {
      throw new HttpException(
        "Bad Request: numeric fields only valid for numeric_estimate type",
        400,
      );
    }
  }

  const computedStartIso = body.start_at
    ? toISOStringSafe(body.start_at)
    : poll.start_at
      ? toISOStringSafe(poll.start_at)
      : undefined;
  const computedEndIso = body.end_at
    ? toISOStringSafe(body.end_at)
    : poll.end_at
      ? toISOStringSafe(poll.end_at)
      : undefined;
  if (
    computedStartIso &&
    computedEndIso &&
    !(computedStartIso < computedEndIso)
  ) {
    throw new HttpException(
      "Bad Request: start_at must be earlier than end_at",
      400,
    );
  }

  const updated = await MyGlobal.prisma.econ_discuss_polls.update({
    where: { id: poll.id },
    data: {
      question: body.question ?? undefined,
      visibility_mode: body.visibility_mode ?? undefined,
      allow_vote_change: body.allow_vote_change ?? undefined,
      min_voter_reputation: body.min_voter_reputation ?? undefined,
      min_account_age_hours: body.min_account_age_hours ?? undefined,
      min_selections: body.min_selections ?? undefined,
      max_selections: body.max_selections ?? undefined,
      scale_points: body.scale_points ?? undefined,
      scale_min_label: body.scale_min_label ?? undefined,
      scale_max_label: body.scale_max_label ?? undefined,
      scale_mid_label: body.scale_mid_label ?? undefined,
      unit_label: body.unit_label ?? undefined,
      numeric_min: body.numeric_min ?? undefined,
      numeric_max: body.numeric_max ?? undefined,
      numeric_step: body.numeric_step ?? undefined,
      start_at: body.start_at ? toISOStringSafe(body.start_at) : undefined,
      end_at: body.end_at ? toISOStringSafe(body.end_at) : undefined,
      updated_at: nowIso,
    },
  });

  const options = await MyGlobal.prisma.econ_discuss_poll_options.findMany({
    where: { econ_discuss_poll_id: updated.id, deleted_at: null },
    orderBy: { position: "asc" },
  });

  const visibilityMode: IEconDiscussPollVisibilityMode = (() => {
    switch (updated.visibility_mode) {
      case "hidden_until_close":
      case "visible_after_vote":
      case "always_visible":
        return updated.visibility_mode as IEconDiscussPollVisibilityMode;
      default:
        throw new HttpException("Invalid visibility_mode in database", 500);
    }
  })();

  const qType: IEconDiscussPollQuestionType = (() => {
    switch (updated.question_type) {
      case "single_choice":
      case "multiple_choice":
      case "likert":
      case "ranking":
      case "numeric_estimate":
        return updated.question_type as IEconDiscussPollQuestionType;
      default:
        throw new HttpException("Invalid question_type in database", 500);
    }
  })();

  return {
    id: updated.id as string & tags.Format<"uuid">,
    postId: updated.econ_discuss_post_id as string & tags.Format<"uuid">,
    question: updated.question,
    questionType: qType,
    visibilityMode,
    expertOnly: updated.expert_only,
    allowVoteChange: updated.allow_vote_change,
    minVoterReputation: updated.min_voter_reputation ?? null,
    minAccountAgeHours: updated.min_account_age_hours ?? null,
    minSelections: updated.min_selections ?? null,
    maxSelections: updated.max_selections ?? null,
    scalePoints: updated.scale_points ?? null,
    scaleMinLabel: updated.scale_min_label ?? null,
    scaleMaxLabel: updated.scale_max_label ?? null,
    scaleMidLabel: updated.scale_mid_label ?? null,
    unitLabel: updated.unit_label ?? null,
    numericMin: updated.numeric_min ?? null,
    numericMax: updated.numeric_max ?? null,
    numericStep: updated.numeric_step ?? null,
    startAt: updated.start_at ? toISOStringSafe(updated.start_at) : null,
    endAt: updated.end_at ? toISOStringSafe(updated.end_at) : null,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    options: options.map((op) => ({
      id: op.id as string & tags.Format<"uuid">,
      pollId: op.econ_discuss_poll_id as string & tags.Format<"uuid">,
      text: op.option_text,
      position: op.position,
      createdAt: toISOStringSafe(op.created_at),
      updatedAt: toISOStringSafe(op.updated_at),
    })),
  };
}
