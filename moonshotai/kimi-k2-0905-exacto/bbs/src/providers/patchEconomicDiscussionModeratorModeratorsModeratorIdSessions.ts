import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";
import { IPageIEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionModeratorSession";
import { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconomicDiscussionModeratorModeratorsModeratorIdSessions(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionModeratorSession.IRequest;
}): Promise<IPageIEconomicDiscussionModeratorSession> {
  // Authorization check - ensure moderator can only access their own sessions
  if (props.moderator.id !== props.moderatorId) {
    throw new HttpException(
      "Forbidden: You can only access your own sessions",
      403,
    );
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where conditions based on filters
  const where: Prisma.economic_discussion_moderator_sessionsWhereInput = {
    moderator: {
      id: props.moderatorId,
    },
  };

  // Apply status filter
  if (props.body.status) {
    if (props.body.status === "active") {
      where.expired_at = null;
    } else if (props.body.status === "expired") {
      where.expired_at = { not: null };
    }
  }

  // Apply date range filters
  if (props.body.start_date || props.body.end_date) {
    where.created_at = {};
    if (props.body.start_date) {
      where.created_at.gte = props.body.start_date;
    }
    if (props.body.end_date) {
      where.created_at.lte = props.body.end_date;
    }
  }

  // Build order by clause
  const orderBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.economic_discussion_moderator_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderBy]: order },
      include: {
        moderator: true,
      },
    }),
    MyGlobal.prisma.economic_discussion_moderator_sessions.count({ where }),
  ]);

  const data: IEconomicDiscussionModeratorSession[] = sessions.map(
    (session) => ({
      id: session.id as string & tags.Format<"uuid">,
      moderator: {
        id: session.moderator?.id as string & tags.Format<"uuid">,
        username: session.moderator?.username ?? "Unknown",
        email_verified: session.moderator?.email_verified ?? false,
        two_factor_enabled: session.moderator?.two_factor_enabled ?? false,
        moderation_level: session.moderator?.moderation_level ?? "junior",
        created_at: toISOStringSafe(session.moderator?.created_at),
      },
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
      href: session.href,
      ip: session.ip,
      referrer: session.referrer,
    }),
  );

  const pagination: IPage.IPagination = {
    current: typia.assert<ICrIPageIntegerRequired>(page.toString()),
    limit: typia.assert<ICrIPageIntegerRequired>(limit.toString()),
    records: typia.assert<ICrIPageIntegerRequired>(total.toString()),
    pages: typia.assert<ICrIPageIntegerRequired>(
      Math.ceil(total / limit).toString(),
    ),
  };

  return {
    data,
    pagination,
  };
}
