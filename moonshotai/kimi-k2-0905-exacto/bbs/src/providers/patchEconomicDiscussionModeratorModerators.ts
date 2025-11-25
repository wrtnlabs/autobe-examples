import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import { IPageIEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconomicDiscussionModeratorModerators(props: {
  moderator: ModeratorPayload;
  body: IEconomicDiscussionModerator.IRequest;
}): Promise<IPageIEconomicDiscussionModerator.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where conditions using object spread for cleaner code
  const whereCondition: Prisma.economic_discussion_moderatorsWhereInput = {
    ...(props.body.search && {
      username: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.is_email_verified !== undefined && {
      email_verified: props.body.is_email_verified,
    }),
    ...(props.body.two_factor_enabled !== undefined && {
      two_factor_enabled: props.body.two_factor_enabled,
    }),
    ...(props.body.moderation_level && {
      moderation_level: props.body.moderation_level,
    }),
  };

  // Build order by condition using computed property names
  const orderByField = props.body.order_by ?? "username";
  const orderDirection = props.body.order_direction ?? "asc";
  const orderConditions: Prisma.economic_discussion_moderatorsOrderByWithRelationInput =
    {
      [orderByField]: orderDirection,
    };

  try {
    // Execute concurrent queries for better performance
    const [moderators, total] = await Promise.all([
      MyGlobal.prisma.economic_discussion_moderators.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: orderConditions,
        select: {
          id: true,
          username: true,
          email_verified: true,
          two_factor_enabled: true,
          moderation_level: true,
          created_at: true,
        },
      }),
      MyGlobal.prisma.economic_discussion_moderators.count({
        where: whereCondition,
      }),
    ]);

    // Map database results to API format with proper type handling
    const moderatorSummaries: IEconomicDiscussionModerator.ISummary[] =
      moderators.map((moderator) => ({
        id: moderator.id,
        username: moderator.username,
        email_verified: moderator.email_verified,
        two_factor_enabled: moderator.two_factor_enabled,
        moderation_level: moderator.moderation_level,
        created_at: toISOStringSafe(moderator.created_at),
      }));

    return {
      data: moderatorSummaries,
      pagination: {
        current: page.toString() as string & tags.Format<"uuid">,
        limit: limit.toString() as string & tags.Format<"uuid">,
        records: total.toString() as string & tags.Format<"uuid">,
        pages: Math.ceil(total / limit).toString() as string &
          tags.Format<"uuid">,
      },
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve moderator list", 500);
  }
}
