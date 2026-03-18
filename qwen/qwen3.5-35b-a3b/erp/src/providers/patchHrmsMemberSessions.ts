import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberSession";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberSessions(props: {
  member: MemberPayload;
  body: IHrmsMemberSession.IRequest;
}): Promise<IPageIHrmsMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const where: Prisma.hrms_member_sessionsWhereInput = {
    hrms_member_id: props.member.id,
    ...(props.body.currentOrganizationId && {
      current_organization_id: props.body.currentOrganizationId,
    }),
    ...(props.body.createdFrom && {
      created_at: { gte: new Date(props.body.createdFrom) },
    }),
    ...(props.body.createdTo && {
      created_at: { lte: new Date(props.body.createdTo) },
    }),
    ...(props.body.expiredFrom && {
      expired_at: { gte: new Date(props.body.expiredFrom) },
    }),
    ...(props.body.expiredTo && {
      expired_at: { lte: new Date(props.body.expiredTo) },
    }),
    ...(props.body.search && {
      OR: [
        { ip: { contains: props.body.search, mode: "insensitive" } },
        { user_agent: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  };
  // Build ORDER BY clause with defaults
  const orderDirection = props.body.order === "asc" ? "asc" : "desc";
  const orderBy: Prisma.hrms_member_sessionsOrderByWithRelationInput =
    props.body.sort === "expired_at"
      ? { expired_at: orderDirection }
      : props.body.sort === "ip"
        ? { ip: orderDirection }
        : props.body.sort === "user_agent"
          ? { user_agent: orderDirection }
          : { created_at: orderDirection };
  // Query data - removed currentOrganization nested select
  const data = await MyGlobal.prisma.hrms_member_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      hrms_member_id: true,
      current_organization_id: true,
      ip: true,
      href: true,
      referrer: true,
      user_agent: true,
      created_at: true,
      expired_at: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.hrms_member_sessions.count({ where });
  // Transform to DTO
  const transformedData = await ArrayUtil.asyncMap(data, async (session) => ({
    id: session.id,
    hrms_member_id: session.hrms_member_id,
    current_organization_id: session.current_organization_id,
    currentOrganization: null,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    user_agent: session.user_agent,
    created_at: toISOStringSafe(session.created_at),
    expired_at: toISOStringSafe(session.expired_at),
  }));
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIHrmsMemberSession.ISummary;
}
