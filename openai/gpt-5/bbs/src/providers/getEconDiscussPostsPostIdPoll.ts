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

export async function getEconDiscussPostsPostIdPoll(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussPoll> {
  const poll = await MyGlobal.prisma.econ_discuss_polls.findFirst({
    where: {
      econ_discuss_post_id: props.postId,
      deleted_at: null,
    },
  });

  if (!poll) {
    throw new HttpException("Not Found", 404);
  }

  const options = await MyGlobal.prisma.econ_discuss_poll_options.findMany({
    where: {
      econ_discuss_poll_id: poll.id,
      deleted_at: null,
    },
    orderBy: { position: "asc" },
  });

  return {
    id: poll.id as string & tags.Format<"uuid">,
    postId: poll.econ_discuss_post_id as string & tags.Format<"uuid">,
    question: poll.question,
    questionType: poll.question_type as IEconDiscussPollQuestionType,
    visibilityMode: poll.visibility_mode as IEconDiscussPollVisibilityMode,
    expertOnly: poll.expert_only,
    allowVoteChange: poll.allow_vote_change,
    minVoterReputation:
      poll.min_voter_reputation === null
        ? null
        : (poll.min_voter_reputation as number & tags.Type<"int32">),
    minAccountAgeHours:
      poll.min_account_age_hours === null
        ? null
        : (poll.min_account_age_hours as number & tags.Type<"int32">),
    minSelections:
      poll.min_selections === null
        ? null
        : (poll.min_selections as number & tags.Type<"int32">),
    maxSelections:
      poll.max_selections === null
        ? null
        : (poll.max_selections as number & tags.Type<"int32">),
    scalePoints:
      poll.scale_points === null
        ? null
        : (poll.scale_points as number & tags.Type<"int32">),
    scaleMinLabel: poll.scale_min_label ?? null,
    scaleMaxLabel: poll.scale_max_label ?? null,
    scaleMidLabel: poll.scale_mid_label ?? null,
    unitLabel: poll.unit_label ?? null,
    numericMin: poll.numeric_min ?? null,
    numericMax: poll.numeric_max ?? null,
    numericStep: poll.numeric_step ?? null,
    startAt: poll.start_at ? toISOStringSafe(poll.start_at) : null,
    endAt: poll.end_at ? toISOStringSafe(poll.end_at) : null,
    createdAt: toISOStringSafe(poll.created_at),
    updatedAt: toISOStringSafe(poll.updated_at),
    options: options.map((o) => ({
      id: o.id as string & tags.Format<"uuid">,
      pollId: o.econ_discuss_poll_id as string & tags.Format<"uuid">,
      text: o.option_text as string & tags.MinLength<1>,
      position: o.position as number & tags.Type<"int32">,
      createdAt: toISOStringSafe(o.created_at),
      updatedAt: toISOStringSafe(o.updated_at),
    })),
  };
}
