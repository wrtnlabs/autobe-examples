import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";
import { IPageIEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchEconomicDiscussionMemberMembersMemberIdSessions(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionMemberSession.IRequest;
}): Promise<IPageIEconomicDiscussionMemberSession.ISummary> {
  // Authorization: Ensure member is accessing their own sessions
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Forbidden: You can only view your own sessions",
      403,
    );
  }

  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderDirection = props.body.order_direction ?? "desc";

  // Build where conditions
  const where: Prisma.economic_discussion_member_sessionsWhereInput = {
    economic_discussion_member_id: props.memberId,
  };

  // Add search filter if provided
  if (props.body.search) {
    where.OR = [
      { ip: { contains: props.body.search } },
      { referrer: { contains: props.body.search } },
    ];
  }

  // Add date range filtering - convert ISO strings to Date objects for Prisma
  if (props.body.start_date || props.body.end_date) {
    where.created_at = {};
    if (props.body.start_date) {
      where.created_at.gte = new Date(props.body.start_date);
    }
    if (props.body.end_date) {
      where.created_at.lte = new Date(props.body.end_date);
    }
  }

  // Determine order by field
  let orderBy: Prisma.economic_discussion_member_sessionsOrderByWithRelationInput =
    {};
  if (props.body.created_at) {
    // Order by created_at field
    orderBy = { created_at: orderDirection };
  } else if (props.body.expired_at === "expired_at") {
    // Order by expired_at field
    orderBy = { expired_at: orderDirection };
  } else if (props.body.expired_at === "ip") {
    // Order by ip field
    orderBy = { ip: orderDirection };
  } else {
    // Default to created_at descending
    orderBy = { created_at: "desc" };
  }

  // Execute queries
  const [sessions, totalCount] = await Promise.all([
    MyGlobal.prisma.economic_discussion_member_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.economic_discussion_member_sessions.count({ where }),
  ]);

  // Transform results to API format
  const data: IEconomicDiscussionMemberSession.ISummary[] = sessions.map(
    (session) => ({
      id: session.id,
      economic_discussion_member_id: session.economic_discussion_member_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer ?? undefined,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    }),
  );

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);

  // Return paginated response
  return {
    data,
    pagination: {
      current: page.toString(),
      limit: limit.toString(),
      records: totalCount.toString(),
      pages: totalPages.toString(),
    },
  };
}
