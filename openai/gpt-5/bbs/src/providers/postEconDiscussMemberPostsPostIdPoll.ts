import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPoll";
import { IEconDiscussPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollQuestionType";
import { IEconDiscussPollVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollVisibilityMode";
import { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconDiscussMemberPostsPostIdPoll(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPoll.ICreate;
}): Promise<IEconDiscussPoll> {
  const { member, postId, body } = props;

  // Verify post exists and is active
  const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      econ_discuss_user_id: true,
    },
  });
  if (!post) throw new HttpException("Post not found", 404);

  // Authorization: only the post author may create a poll
  if (post.econ_discuss_user_id !== member.id) {
    throw new HttpException(
      "Unauthorized: Only the post author can create a poll",
      403,
    );
  }

  // Enforce one-poll-per-post (active)
  const existing = await MyGlobal.prisma.econ_discuss_polls.findFirst({
    where: {
      econ_discuss_post_id: postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing)
    throw new HttpException("Conflict: Poll already exists for this post", 409);

  // Business validations
  const startAtNorm = body.startAt ? toISOStringSafe(body.startAt) : null;
  const endAtNorm = body.endAt ? toISOStringSafe(body.endAt) : null;
  if (startAtNorm && endAtNorm) {
    const startMs = Date.parse(startAtNorm);
    const endMs = Date.parse(endAtNorm);
    if (
      Number.isFinite(startMs) &&
      Number.isFinite(endMs) &&
      startMs >= endMs
    ) {
      throw new HttpException(
        "Bad Request: startAt must be earlier than endAt",
        400,
      );
    }
  }
  if (
    body.numericMin !== undefined &&
    body.numericMin !== null &&
    body.numericMax !== undefined &&
    body.numericMax !== null &&
    !(body.numericMin < body.numericMax)
  ) {
    throw new HttpException(
      "Bad Request: numericMin must be less than numericMax",
      400,
    );
  }
  if (
    body.numericStep !== undefined &&
    body.numericStep !== null &&
    !(body.numericStep > 0)
  ) {
    throw new HttpException(
      "Bad Request: numericStep must be greater than 0",
      400,
    );
  }
  if (
    body.minSelections !== undefined &&
    body.minSelections !== null &&
    body.maxSelections !== undefined &&
    body.maxSelections !== null &&
    body.minSelections > body.maxSelections
  ) {
    throw new HttpException(
      "Bad Request: minSelections must be less than or equal to maxSelections",
      400,
    );
  }

  // Normalize and validate options for option-driven question types
  const isOptionDriven =
    body.questionType === "single_choice" ||
    body.questionType === "multiple_choice" ||
    body.questionType === "ranking";

  type NormalizedOption = {
    id: string & tags.Format<"uuid">;
    text: string;
    position: number & tags.Type<"int32">;
  };

  let normalizedOptions: NormalizedOption[] = [];
  if (isOptionDriven) {
    const source = body.options ?? [];

    // Duplicate text check
    const textSet = new Set<string>();
    for (const opt of source) {
      if (textSet.has(opt.text)) {
        throw new HttpException(
          "Bad Request: Duplicate option text detected",
          400,
        );
      }
      textSet.add(opt.text);
    }

    // Prepare positions: ensure uniqueness; assign for missing values
    const usedPositions = new Set<number>();
    for (const opt of source) {
      if (opt.position !== undefined) {
        if (usedPositions.has(opt.position)) {
          throw new HttpException(
            "Bad Request: Duplicate option position detected",
            400,
          );
        }
        usedPositions.add(opt.position);
      }
    }
    let nextPos = 1;
    const computed: NormalizedOption[] = [];
    for (const opt of source) {
      let pos: number;
      if (opt.position !== undefined) pos = opt.position;
      else {
        while (usedPositions.has(nextPos)) nextPos += 1;
        pos = nextPos;
        usedPositions.add(pos);
        nextPos += 1;
      }
      computed.push({
        id: v4() as string & tags.Format<"uuid">,
        text: opt.text,
        position: pos as number & tags.Type<"int32">,
      });
    }
    normalizedOptions = computed;
  }

  // Persist poll and options in a transaction
  const now = toISOStringSafe(new Date());
  const pollId = v4() as string & tags.Format<"uuid">;

  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.econ_discuss_polls.create({
        data: {
          id: pollId,
          econ_discuss_post_id: postId,
          question: body.question,
          question_type: body.questionType,
          visibility_mode: body.visibilityMode,
          expert_only: body.expertOnly,
          allow_vote_change: body.allowVoteChange,
          min_voter_reputation: body.minVoterReputation ?? null,
          min_account_age_hours: body.minAccountAgeHours ?? null,
          min_selections: body.minSelections ?? null,
          max_selections: body.maxSelections ?? null,
          scale_points: body.scalePoints ?? null,
          scale_min_label: body.scaleMinLabel ?? null,
          scale_max_label: body.scaleMaxLabel ?? null,
          scale_mid_label: body.scaleMidLabel ?? null,
          unit_label: body.unitLabel ?? null,
          numeric_min: body.numericMin ?? null,
          numeric_max: body.numericMax ?? null,
          numeric_step: body.numericStep ?? null,
          start_at: startAtNorm,
          end_at: endAtNorm,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });

      if (isOptionDriven && normalizedOptions.length > 0) {
        await tx.econ_discuss_poll_options.createMany({
          data: normalizedOptions.map((o) => ({
            id: o.id,
            econ_discuss_poll_id: pollId,
            option_text: o.text,
            position: o.position,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          })),
        });
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        throw new HttpException("Conflict: Unique constraint violated", 409);
      }
    }
    throw err;
  }

  // Build response using prepared values
  const optionsOut: IEconDiscussPollOption[] = isOptionDriven
    ? normalizedOptions
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((o) => ({
          id: o.id,
          pollId: pollId,
          text: o.text,
          position: o.position,
          createdAt: now,
          updatedAt: now,
        }))
    : [];

  return {
    id: pollId,
    postId,
    question: body.question,
    questionType: body.questionType,
    visibilityMode: body.visibilityMode,
    expertOnly: body.expertOnly,
    allowVoteChange: body.allowVoteChange,
    minVoterReputation: body.minVoterReputation ?? null,
    minAccountAgeHours: body.minAccountAgeHours ?? null,
    minSelections: body.minSelections ?? null,
    maxSelections: body.maxSelections ?? null,
    scalePoints: body.scalePoints ?? null,
    scaleMinLabel: body.scaleMinLabel ?? null,
    scaleMaxLabel: body.scaleMaxLabel ?? null,
    scaleMidLabel: body.scaleMidLabel ?? null,
    unitLabel: body.unitLabel ?? null,
    numericMin: body.numericMin ?? null,
    numericMax: body.numericMax ?? null,
    numericStep: body.numericStep ?? null,
    startAt: startAtNorm ?? null,
    endAt: endAtNorm ?? null,
    createdAt: now,
    updatedAt: now,
    options: optionsOut,
  };
}
