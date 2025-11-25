import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";
import { IPageIDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorEmailVerifications(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardEmailVerification.IRequest;
}): Promise<IPageIDiscussionBoardEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {};

  if (props.body.discussion_board_member_id) {
    whereCondition.discussion_board_member_id =
      props.body.discussion_board_member_id;
  }

  if (props.body.email) {
    whereCondition.email = {
      contains: props.body.email,
    };
  }

  if (props.body.is_verified !== undefined) {
    whereCondition.verified_at = props.body.is_verified ? { not: null } : null;
  }

  if (props.body.is_expired !== undefined) {
    const now = new Date();
    whereCondition.expires_at = props.body.is_expired
      ? { lt: now }
      : { gte: now };
  }

  const orderByField = props.body.sort_by ?? "created_at";
  const orderDirection = props.body.order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_email_verifications.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        [orderByField]: orderDirection,
      },
    }),
    MyGlobal.prisma.discussion_board_email_verifications.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((record) => ({
      id: record.id,
      discussion_board_member_id: record.discussion_board_member_id,
      email: record.email,
      verified_at: record.verified_at
        ? toISOStringSafe(record.verified_at)
        : null,
      expires_at: toISOStringSafe(record.expires_at),
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
