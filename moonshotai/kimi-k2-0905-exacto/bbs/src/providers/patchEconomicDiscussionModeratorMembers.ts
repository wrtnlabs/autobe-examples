import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import { IPageIEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconomicDiscussionModeratorMembers(props: {
  moderator: ModeratorPayload;
  body: IEconomicDiscussionMember.IRequest;
}): Promise<IPageIEconomicDiscussionMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const order = props.body.order ?? "desc";
  const sortBy = props.body.sort_by ?? "created_at";

  // Build where conditions using structured approach
  const whereConditions: Prisma.economic_discussion_membersWhereInput = {};

  // Search text filter (username or email)
  if (props.body.search) {
    whereConditions.OR = [
      { username: { contains: props.body.search } },
      { email: { contains: props.body.search } },
    ];
  }

  // Email verification filter
  if (props.body.email_verified !== undefined) {
    whereConditions.email_verified = props.body.email_verified;
  }

  // Date range filters for registration
  if (props.body.created_before || props.body.created_after) {
    whereConditions.created_at = {};
    if (props.body.created_before) {
      whereConditions.created_at.lte = props.body.created_before;
    }
    if (props.body.created_after) {
      whereConditions.created_at.gte = props.body.created_after;
    }
  }

  // Exclude specific member IDs
  if (props.body.exclude_ids && props.body.exclude_ids.length > 0) {
    whereConditions.NOT = {
      id: { in: props.body.exclude_ids },
    };
  }

  // Reputation score range filters
  if (
    props.body.reputation_score_min !== undefined ||
    props.body.reputation_score_max !== undefined
  ) {
    whereConditions.reputation_score = {};
    if (props.body.reputation_score_min !== undefined) {
      whereConditions.reputation_score.gte = props.body.reputation_score_min;
    }
    if (props.body.reputation_score_max !== undefined) {
      whereConditions.reputation_score.lte = props.body.reputation_score_max;
    }
  }

  // Last activity filters using updated_at as proxy
  if (props.body.last_active_before || props.body.last_active_after) {
    whereConditions.updated_at = {};
    if (props.body.last_active_before) {
      whereConditions.updated_at.lte = props.body.last_active_before;
    }
    if (props.body.last_active_after) {
      whereConditions.updated_at.gte = props.body.last_active_after;
    }
  }

  // Get total count and paginated results
  const [members, total] = await Promise.all([
    MyGlobal.prisma.economic_discussion_members.findMany({
      where: whereConditions,
      select: {
        id: true,
        username: true,
        email: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
    }),
    MyGlobal.prisma.economic_discussion_members.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: typia.assert<ICrIPageIntegerRequired>(page),
      limit: typia.assert<ICrIPageIntegerRequired>(limit),
      records: typia.assert<ICrIPageIntegerRequired>(total),
      pages: typia.assert<ICrIPageIntegerRequired>(Math.ceil(total / limit)),
    },
    data: members.map((member) => ({
      id: member.id,
      username: member.username,
      email: member.email,
    })),
  };
}
