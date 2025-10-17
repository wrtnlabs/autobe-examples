import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import { IPageIRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationAppeal";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchRedditLikeMemberModerationAppeals(props: {
  member: MemberPayload;
  body: IRedditLikeModerationAppeal.IRequest;
}): Promise<IPageIRedditLikeModerationAppeal> {
  const { member, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereCondition = {
    appellant_member_id: member.id,
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.appeal_type !== undefined &&
      body.appeal_type !== null && {
        appeal_type: body.appeal_type,
      }),
    ...(body.is_escalated !== undefined &&
      body.is_escalated !== null && {
        is_escalated: body.is_escalated,
      }),
  };

  const [appeals, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_moderation_appeals.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_moderation_appeals.count({
      where: whereCondition,
    }),
  ]);

  const data: IRedditLikeModerationAppeal[] = appeals.map((appeal) => ({
    id: appeal.id as string & tags.Format<"uuid">,
    appellant_member_id: appeal.appellant_member_id as string &
      tags.Format<"uuid">,
    appeal_type: appeal.appeal_type,
    appeal_text: appeal.appeal_text,
    status: appeal.status,
    decision_explanation:
      appeal.decision_explanation === null
        ? undefined
        : appeal.decision_explanation,
    is_escalated: appeal.is_escalated,
    expected_resolution_at: toISOStringSafe(appeal.expected_resolution_at),
    created_at: toISOStringSafe(appeal.created_at),
    reviewed_at:
      appeal.reviewed_at === null
        ? undefined
        : toISOStringSafe(appeal.reviewed_at),
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: totalPages,
    },
    data: data,
  };
}
